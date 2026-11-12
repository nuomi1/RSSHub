import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { parseDateInTimezone } from '@/utils/parse-date-in-timezone';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'news', label: '新聞' },
    { value: 'big-data', label: 'AI' },
    { value: 'cloud', label: 'Cloud' },
    { value: 'devops', label: 'DevOps' },
    { value: 'security', label: '資安' },
];

export const route: Route = {
    path: '/tw/feeds/:category',
    categories: ['new-media'],
    example: '/ithome/tw/feeds/news',
    parameters: { category: { description: '類別', options: CATEGORY_OPTIONS } },
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
            source: ['www.ithome.com.tw/:category', 'www.ithome.com.tw/:category/feeds'],
        },
    ],
    name: 'Feeds',
    maintainers: ['miles170'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '類別',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const baseUrl = 'https://www.ithome.com.tw';
    const currentUrl = `${baseUrl}/${ctx.req.param('category')}/feeds`;
    const response = await got(currentUrl);
    const $ = load(response.data);
    const name = $('a.active-trail').text();
    const items = await pMap(
        $('.title a').toArray(),
        async (item) => {
            const link = baseUrl + $(item).attr('href');
            const details = await cache.tryGet(`ithome:tw-article:${link}`, async () => {
                const response = await got(link);
                const $ = load(response.data);
                const date = $('.submitted .created').first().text();
                return {
                    title: $('.page-header').text(),
                    author: $('.author a').text(),
                    description: $('article').eq(0).html(),
                    pubDate: date && Number.isFinite(parseDate(date, 'YYYY-MM-DD', true).getTime()) ? parseDateInTimezone(date, 8) : undefined,
                    link,
                };
            });
            return { ...details, category: name };
        },
        { concurrency: 3 }
    );

    return {
        title: `${name} | iThome`,
        link: currentUrl,
        description: 'iThome Online 是臺灣第一個網路原生報，提供IT產業即時新聞、企業IT產品報導與測試、技術專題、IT應用報導、IT書訊，以及面向豐富的名家專欄。',
        item: items,
    };
}
