import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CATEGORY_OPTIONS = [
    { value: 'news-policy', label: '時事。政策' },
    { value: 'food-safety', label: '食安' },
    { value: 'knowledge', label: '新知' },
    { value: 'country-life', label: '愛地方' },
    { value: 'good-farming', label: '種好田' },
    { value: 'good-food-fun', label: '好吃。好玩' },
    { value: 'food-education', label: '食農教育' },
    { value: 'people-and-history', label: '人物' },
    { value: 'raising-and-breeding', label: '漁業。畜牧' },
    { value: 'living-green-travel', label: '綠生活。國際' },
    { value: 'opinion', label: '評論' },
];

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/newsmarket',
    parameters: { category: { description: '分类，见下表，默认为首页', options: CATEGORY_OPTIONS } },
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
            source: ['newsmarket.com.tw/blog/category/:category', 'newsmarket.com.tw/'],
        },
    ],
    name: '分類',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';

    const rootUrl = 'https://www.newsmarket.com.tw';
    const currentUrl = `${rootUrl}${category ? `/blog/category/${category}` : ''}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const list = $('.title a')
        .slice(0, getRouteLimit(ctx, 20))
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.text(),
                link: $item.attr('href'),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                content('figure img').each((_, el) => {
                    content(el)
                        .parent()
                        .html(`<img src="${content(el).attr('data-src')}">`);
                });

                content('.inline-post').remove();

                item.author = content('.author-name').text();
                item.description = content('.entry-content').html();
                item.pubDate = parseDate(detailResponse.data.match(/"datePublished":"(.*)","dateModified"/)[1]);

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
