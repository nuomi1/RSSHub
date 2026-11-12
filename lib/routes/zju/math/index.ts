import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '0', label: '重要通知' },
    { value: '1', label: '本科生' },
    { value: '2', label: '研究生' },
    { value: '3', label: '科研' },
    { value: '4', label: '教学' },
    { value: '5', label: '人事' },
    { value: '6', label: '公示' },
];

const base = 'http://www.math.zju.edu.cn/';
type NewsItem = {
    item: DataItem;
    intranetOnly: boolean;
};
const categoryMap = new Map([
    [0, { id: 'zytz/list.htm', title: '浙江大学数学科学院-重要通知' }],
    [1, { id: 'bkstz/list.htm', title: '浙江大学数学科学院-本科生' }],
    [2, { id: 'yjstz/list.htm', title: '浙江大学数学科学院-研究生' }],
    [3, { id: 'kytz/list.htm', title: '浙江大学数学科学院-科研' }],
    [4, { id: 'jxtz/list.htm', title: '浙江大学数学科学院-教学' }],
    [5, { id: '38069/list.htm', title: '浙江大学数学科学院-人事' }],
    [6, { id: 'gs/list.htm', title: '浙江大学数学科学院-公示' }],
]);
async function fetchNewsItemsByCategory(categoryId: string): Promise<NewsItem[]> {
    const response = await got({
        method: 'get',
        url: new URL(categoryId, base).href,
    });
    const $ = load(response.data);
    return $('.news_list #wp_news_w12 li')
        .toArray()
        .map((item): NewsItem | null => {
            const element = $(item);
            const link = element.find('a[href]').attr('href');
            const titleNode = element.find('.title');
            // if the title node contains an image with src "/_images/news/icon/unopen.gif",
            // it indicates that the news item is only accessible from the intranet
            const intranetOnly = titleNode.find('img[src="/_images/news/icon/unopen.gif"]').length > 0;
            const title = titleNode.text() || element.find('a[href]').attr('title');
            const dateText = `${element.find('.date .y').text()}-${element.find('.date .d').text()}`;
            // If the title or link is missing, we skip this item as it is likely not a valid news entry.
            if (!(title && link)) {
                return null;
            }
            return {
                item: {
                    title,
                    link: new URL(link, base).href,
                    pubDate: timezone(parseDate(dateText), 8),
                },
                intranetOnly,
            };
        })
        .filter((entry) => entry !== null);
}
async function enrichNewsItemWithDetails(item: NewsItem, refererUrl: string): Promise<DataItem> {
    const dataItem = item.item;
    if (item.intranetOnly || !dataItem.link) {
        return dataItem;
    }
    try {
        const details = await cache.tryGet(`zju:math:details:${dataItem.link}`, async () => {
            const response = await got({
                method: 'get',
                url: dataItem.link,
                headers: { Referer: refererUrl },
            });
            const $ = load(response.data);
            const article = $('.wp_articlecontent');
            if (!article.length) {
                throw new Error('Article content is unavailable; the source may require a campus connection or login.');
            }
            const [, author, pubDate] =
                $('.item_info')
                    .text()
                    .match(/来源：([\s\S]*?)发布时间：(\d{4}-\d{2}-\d{2})/) ?? [];
            return {
                description: article.html(),
                author,
                ...(pubDate && { pubDate: timezone(parseDate(pubDate), 8) }),
            };
        });
        return { ...dataItem, ...details };
    } catch {
        return dataItem;
    }
}
export const route: Route = {
    path: '/math/:type',
    categories: ['university'],
    example: '/zju/math/0',
    parameters: { type: { description: '分类，见下表', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '数学科学学院',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
    maintainers: ['Alex222222222222'],
    handler,
    url: 'www.math.zju.edu.cn',
};
async function handler(ctx: Context) {
    const type = Math.trunc(Number(ctx.req.param('type')));
    const categoryInfo = categoryMap.get(type);
    if (!categoryInfo) {
        const validTypes = categoryMap.keys().toArray().join(', ');
        throw new Error(`Invalid type: ${type}. Valid types are: ${validTypes}`);
    }
    const categoryUrl = new URL(categoryInfo.id, base).href;
    const newsItems = await fetchNewsItemsByCategory(categoryInfo.id);
    const items = await pMap(newsItems, (item) => enrichNewsItemWithDetails(item, categoryUrl), { concurrency: 3 });
    return {
        title: categoryInfo.title,
        link: categoryUrl,
        item: items,
    };
}
