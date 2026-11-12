import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: '', label: 'ALL' },
    { value: '昆仑德语社', label: 'FIX 德语社' },
    { value: '欧美剧集', label: '欧美剧集' },
    { value: '欧美电影', label: '欧美电影' },
    { value: '综艺纪录', label: '综艺 & 纪录' },
    { value: 'fix 日语社', label: 'FIX 日语社' },
    { value: 'fix 韩语社', label: 'FIX 韩语社' },
    { value: 'fix 法语社', label: 'FIX 法语社' },
];

export const route: Route = {
    path: '/:category?',
    categories: ['multimedia'],
    example: '/zimuxia',
    parameters: { category: { description: '分类，见下表，默认为 ALL', options: CATEGORY_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');

    const rootUrl = 'https://www.zimuxia.cn';
    const currentUrl = `${rootUrl}/我们的作品`;
    const response = await got(currentUrl, {
        searchParams: {
            cat: category ?? undefined,
        },
    });

    const $ = load(response.data);

    const list = $('.pg-item a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.find('h2').text(),
                link: $item.attr('href'),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got(item.link);
                const content = load(detailResponse.data);

                item.description = content('.content-box').html();

                return item;
            })
        )
    );

    return {
        title: `${category || 'ALL'} - FIX字幕侠`,
        link: response.url,
        item: items,
    };
}
