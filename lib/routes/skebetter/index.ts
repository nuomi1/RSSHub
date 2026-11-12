import { config } from '@/config';
import type { Data, Route } from '@/types';
import cache from '@/utils/cache';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { fetchData, processItems } from './utils';

const TYPE_OPTIONS = [
    { value: 'hot', label: '急上昇' },
    { value: 'week', label: '週間' },
    { value: 'month', label: '月間' },
    { value: 'latest', label: '新着' },
];

export const route: Route = {
    path: '/:type',
    categories: ['anime'],
    example: '/skebetter/hot',
    parameters: { type: { description: 'Type, see below', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
        nsfw: true,
    },
    name: 'Hot',
    maintainers: ['Tsuyumi25'],
    handler,
    radar: [
        {
            title: 'Skebetter - Hot',
            source: ['skebetter.com'],
            target: '/hot',
        },
        {
            title: 'Skebetter - Week',
            source: ['skebetter.com'],
            target: '/week',
        },
        {
            title: 'Skebetter - Month',
            source: ['skebetter.com'],
            target: '/month',
        },
        {
            title: 'Skebetter - Latest',
            source: ['skebetter.com'],
            target: '/latest',
        },
    ],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: 'Type',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx): Promise<Data> {
    const type = ctx.req.param('type');
    const baseUrl = 'https://api.twieromanga.com/api/hotv2';
    const typeMap = {
        hot: '急上昇',
        week: '週間',
        month: '月間',
        latest: '新着',
    };
    const linkMap = {
        hot: '',
        week: '?term=week',
        month: '?term=month',
        latest: '?term=latest',
    };

    const url = `${baseUrl}?type=${type}`;

    const items = await cache.tryGet(
        `skebetter:titles:v3:${url}`,
        async () => {
            const data = await fetchData(url);
            return processItems(data, 'index');
        },
        config.cache.routeExpire,
        false
    );

    return {
        title: `Skebetter - ${typeMap[type]}`,
        link: `https://skebetter.com/${linkMap[type]}`,
        item: items,
    };
}
