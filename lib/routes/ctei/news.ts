import { load } from 'cheerio';
import type { Context } from 'hono';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: 'bwzq', label: '本网专区' },
    { value: 'newsyw', label: '要闻' },
    { value: 'domestic', label: '国内' },
    { value: 'internal', label: '国际' },
    { value: 'company', label: '企业' },
    { value: 'brand', label: '品牌' },
    { value: 'trade', label: '外贸' },
    { value: 'policy', label: '政策' },
    { value: 'Technology', label: '科技' },
    { value: 'fashion', label: '流行' },
    { value: 'apparel', label: '服装' },
    { value: 'hometex', label: '家纺' },
];
const ID_OPTIONS_DEFAULT = 'bwzq';

export const route: Route = {
    path: '/news/:id?',
    categories: ['new-media'],
    example: '/ctei/news/bwzq',
    parameters: { id: { description: '分类 id，可在分类页的 URL 中找到，默认为本网专区', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    name: '资讯',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { id = ID_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'http://news.ctei.cn';
    const currentUrl = `${rootUrl}/${id}/`;

    const response = await ofetch(currentUrl);
    const $ = load(response);

    const legacyLinks = $('.news_text ul li a');
    const list: DataItem[] = (legacyLinks.length ? legacyLinks : $('.new_pd li a'))
        .toArray()
        .filter((item) => /\/t\d{8}_\d+\.htm/.test($(item).attr('href') ?? ''))
        .map((item) => {
            const $item = $(item);
            const link = new URL($item.attr('href')!, currentUrl).href;

            return {
                title: $item.attr('title') || $item.text(),
                link,
                pubDate: timezone(parseDate(link.match(/\/t(\d{8})_\d+\.htm/)![1], 'YYYYMMDD'), 8),
            };
        });

    const uniqueItems = new Map(list.map((item) => [item.link, item])).values().toArray();
    const articles = uniqueItems;
    const items = await Promise.all(
        articles.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await ofetch(item.link!);
                const content = load(detailResponse);

                item.description = content('.TRS_Editor').html();

                return item;
            })
        )
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
