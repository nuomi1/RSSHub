import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'xxxw', label: '学校新闻' },
    { value: 'dzys', label: '砥志研思' },
    { value: 'ldsr', label: '立德树人' },
    { value: 'cdsy', label: '传道授业' },
    { value: 'xwzz', label: '校闻周知' },
];

export const route: Route = {
    path: '/index/:category?',
    categories: ['university'],
    example: '/xaut/index/tzgg',
    parameters: { category: { description: '通知类别，默认为学校新闻', options: CATEGORY_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '学校主页',
    maintainers: ['mocusez'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '通知类别',
        options: CATEGORY_OPTIONS,
    }),
};
async function fetchDescription(link: string): Promise<DataItem['description']> {
    if (link.includes('://zhixing.xaut.edu.cn/') || link.includes('://xinwen.xaut.edu.cn/')) {
        return undefined;
    }
    const response = await got(link);
    return load(response.body)('#vsb_content').html() ?? undefined;
}
async function handler(ctx) {
    let category = ctx.req.param('category');
    const categoryPaths = { xxxw: 'xxxw.htm', dzys: 'dzys.htm', ldsr: 'ldsr.htm', cdsy: 'cdsy.htm', xwzz: 'xwzz.htm' };
    const categoryTitles = { xxxw: '学校新闻', dzys: '砥志研思', ldsr: '立德树人', cdsy: '传道授业', xwzz: '校闻周知' };
    if (categoryTitles[category] === undefined) {
        category = 'xxxw';
    }
    const response = await got({
        method: 'get',
        url: 'http://www.xaut.edu.cn/index/' + categoryPaths[category],
    });
    const data = response.body;
    const $ = load(data);
    const list = $('div.nlist ul li')
        .toArray()
        .filter((item) => $(item).find('a').attr('href'))
        .map((item): DataItem => {
            const $item = $(item);
            const link = new URL($item.find('a').attr('href')!, 'http://www.xaut.edu.cn/index/' + categoryPaths[category]).href;
            const rawDate = $item.find('div.time').text();
            const pubDate = rawDate ? timezone(parseDate(rawDate, 'YYYY-MM-DD', true), 8) : undefined;
            const title = $item.find('h5').text();
            return {
                title,
                link,
                pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : undefined,
            };
        });
    return {
        title: '西安理工大学官网-' + categoryTitles[category],
        link: 'http://www.xaut.edu.cn',
        description: '西安理工大学官网-' + categoryTitles[category],
        item: await pMap(
            list,
            (item) =>
                mapResolvedValue(
                    cache.tryGet(`xaut:index:detail:v3:${item.link}`, () => fetchDescription(item.link!)),
                    (description) => ({
                        ...item,
                        description,
                    })
                ),
            { concurrency: 3, stopOnError: false }
        ),
    };
}
async function mapResolvedValue<T, U>(promise: Promise<T>, mapper: (value: T) => U | Promise<U>): Promise<U> {
    const value = await promise;
    return mapper(value);
}
