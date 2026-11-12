import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'article', label: '所有文章' },
    { value: 'daily-brief', label: '早报' },
    { value: 'trending', label: '热点' },
];
const CATEGORY_OPTIONS_DEFAULT = 'article';

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/ngocn2',
    parameters: { category: { description: '分类，见下表，默认为所有文章', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['ngocn2.org/'],
        },
    ],
    name: '首页',
    maintainers: ['nczitzk'],
    handler,
    url: 'ngocn2.org/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'https://ngocn2.org';
    const currentUrl = `${rootUrl}/${category}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const list = $('.articleroll__article a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.find('.title').text(),
                link: `${rootUrl}${$item.attr('href')}`,
                pubDate: parseDate($item.find('.meta').text()),
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

                content('.gatsby-resp-image-link').each((_, el) => {
                    content(el).html(`<img src="${content(el).find('img').attr('src')}">`);
                });

                item.description = content('.article__content').html();

                return item;
            })
        )
    );

    return {
        title: `${$('.sectitle__content').text()} - NGOCN`,
        link: currentUrl,
        item: items,
    };
}
