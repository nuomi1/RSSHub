import { load } from 'cheerio';

import type { Language, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { baseUrl, parseArticle } from './utils';

const CATEGORY_OPTIONS = [
    { value: '', label: '最新文章' },
    { value: 'app', label: 'App 评测' },
    { value: 'phone', label: '手机开箱' },
    { value: 'computer', label: '笔电开箱' },
    { value: 'accessories', label: '3C 周边' },
    { value: 'tutorial', label: '教学小技巧' },
    { value: 'techlife', label: '科技情报' },
];

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/agirls/app',
    parameters: { category: { description: '分类，默认为最新文章，可在对应主题页的 URL 中找到，下表仅列出部分', options: CATEGORY_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['agirls.aotter.net/posts/:category'],
            target: '/:category',
        },
    ],
    name: '分类',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const { category = '' } = ctx.req.param();
    const link = `${baseUrl}/posts${category ? `/${category}` : ''}`;
    const response = await ofetch(link);

    const $ = load(response);

    const list = $('.ag-post-list .ag-post-item__link')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: `${baseUrl}${$item.attr('href')}`,
            };
        });

    const items = await Promise.all(list.map((item) => cache.tryGet(item.link, () => parseArticle(item))));

    return {
        title: $('head title').text(),
        link,
        description: $('head meta[name=description]').attr('content'),
        item: items,
        language: $('html').attr('lang') as Language,
    };
}
