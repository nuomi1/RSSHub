import { config } from '@/config';
import type { Data, Route } from '@/types';
import cache from '@/utils/cache';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { fetchData, processItems } from './utils';

const ORDER_OPTIONS = [
    { value: '1', label: '新着 (Latest)' },
    { value: '2', label: '人気 (Hot)' },
];
const ORDER_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/manga/:order',
    categories: ['anime'],
    example: '/skebetter/manga/1',
    parameters: { order: { description: 'Order, see below.', options: ORDER_OPTIONS, default: ORDER_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
        nsfw: true,
    },
    name: 'Manga',
    maintainers: ['Tsuyumi25'],
    handler,
    radar: [
        {
            title: 'Manga - Latest',
            source: ['skebetter.com/series'],
            target: '/manga/1',
        },
        {
            title: 'Manga - Hot',
            source: ['skebetter.com/series'],
            target: '/manga/2',
        },
    ],
    description: renderOptionsMarkdownTable({
        parameter: 'order',
        description: 'Order',
        options: ORDER_OPTIONS,
    }),
};

async function handler(ctx): Promise<Data> {
    const order = ctx.req.param('order') ?? ORDER_OPTIONS_DEFAULT;
    const baseUrl = 'https://api.twieromanga.com/api/mangaseries';
    const orderMap = {
        '1': '新着',
        '2': '人気',
    };

    const url = `${baseUrl}?order=${order}`;

    const items = await cache.tryGet(
        `skebetter:titles:v3:${url}`,
        async () => {
            const data = await fetchData(url, true);
            return processItems(data, 'manga');
        },
        config.cache.routeExpire,
        false
    );

    return {
        title: `Skebetter Manga - ${orderMap[order]}`,
        link: `https://skebetter.com/series?order=${order}`,
        item: items,
    };
}
