import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const ID_OPTIONS = [
    { value: '1', label: '新闻' },
    { value: '2', label: '通告栏' },
];
const ID_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/:id?',
    categories: ['study'],
    example: '/camchina',
    parameters: { id: { description: '分类，见下表，默认为 1，即新闻', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
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
            source: ['www.camchina.org.cn/categories/:id', 'www.camchina.org.cn/'],
        },
    ],
    name: '栏目',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;
    const limit = getRouteLimit(ctx, 50);

    const rootUrl = 'http://www.camchina.org.cn';
    const currentUrl = `${rootUrl}/categories/${id}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('.M-main-l p a')
        .slice(0, limit)
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

                item.description = content('.content').html();

                return item;
            })
        )
    );

    return {
        title: `中国管理现代化研究会 - ${$('.title_red').text()}`,
        link: currentUrl,
        item: items,
    };
}
