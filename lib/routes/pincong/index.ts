import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { baseUrl, get } from './utils';

const SORT_OPTIONS = [
    { value: 'new', label: '最新' },
    { value: 'recommend', label: '推荐' },
    { value: 'hot', label: '热门' },
];

export const route: Route = {
    path: '/category/:category?/:sort?',
    categories: ['bbs'],
    example: '/pincong/category/1/new',
    parameters: { category: '分类，与官网分类 URL `category-` 后的数字对应，默认为全部', sort: { description: '排序方式，参数可见下表，默认为推荐', options: SORT_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '发现',
    maintainers: ['zphw'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'sort',
        description: '排序方式',
        options: SORT_OPTIONS,
    }),
};

async function handler(ctx) {
    let url = `${baseUrl}/`;

    const sortMap = {
        new: 'sort_type-new',
        recommend: 'recommend-1',
        hot: 'sort_type-hot__day2',
    };

    url += (ctx.req.param('sort') && sortMap[ctx.req.param('sort')]) || 'recommend-1';
    url += ctx.req.param('category') ? '__category-' + ctx.req.param('category') : '';

    const html = await get(url, cache);

    const $ = load(html);
    const list = $('div.aw-item');

    return {
        title: '品葱 - 发现',
        link: url,
        item: list.toArray().map((item) => ({
            title: $(item).find('h4 a').text().trim(),
            link: baseUrl + $(item).find('h4 a').attr('href'),
            pubDate: parseDate(Number($(item).attr('data-created-at')) * 1000),
        })),
    };
}
