import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'bqym', label: '本期要目' },
    { value: 'wlsf', label: '网络首发' },
    { value: 'xshd', label: '学术活动' },
    { value: 'tzgg', label: '通知公告' },
];
const CATEGORY_OPTIONS_DEFAULT = 'bqym';

export const route: Route = {
    path: '/:category?',
    categories: ['journal'],
    example: '/mwm',
    parameters: { category: { description: '分类，见下表，默认为本期要目', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['mwm.net.cn/web/:category', 'mwm.net.cn/'],
        },
    ],
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
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const requestedLimit = Number(ctx.req.query('limit'));
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 100;

    const rootUrl = 'http://www.mwm.net.cn';
    const currentUrl = `${rootUrl}/web/${category === 'bqym' ? `bqym?pagesize=${limit}` : category}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    $('.n_date').remove();

    let items = $('.n_title, .con1_text')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')}`,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                item.description = content('.mrt20').html();
                item.author = content('.mrl20')
                    .text()
                    .trim()
                    .replace(/作者：/, '');
                item.pubDate = parseDate(content('.date').eq(0).text(), 'YYYY年MM月DD日');

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
