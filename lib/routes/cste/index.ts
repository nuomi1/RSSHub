import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '16', label: '通知公告' },
    { value: '18', label: '学会新闻' },
    { value: '19', label: '科协简讯' },
    { value: '20', label: '学科动态' },
    { value: '21', label: '往事钩沉' },
];
const ID_OPTIONS_DEFAULT = '16';

export const route: Route = {
    path: '/:id?',
    categories: ['study'],
    example: '/cste',
    parameters: { id: { description: '分类，见下表，默认为 16，即通知公告', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
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
    const limit = getRouteLimit(ctx, 10);

    const rootUrl = 'https://www.cste.org.cn';
    const currentUrl = `${rootUrl}/site/term/${id}.html`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('a.list-group-item')
        .slice(0, limit)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.find('h5').text(),
                link: new URL($item.attr('href')!, rootUrl).href,
                pubDate: timezone(parseDate($item.find('small').text()), 8),
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

                content('.Next').remove();

                item.description = content('.article').html();

                return item;
            })
        )
    );

    return {
        title: `中国技术经济学会 - ${$('.leftTop').text()}`,
        link: currentUrl,
        item: items,
    };
}
