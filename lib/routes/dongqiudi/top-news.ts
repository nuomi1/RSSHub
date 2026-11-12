import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { processFeedType2 } from './utils';

const ID_OPTIONS = [
    { value: '1', label: '头条' },
    { value: '55', label: '深度' },
    { value: '37', label: '闲情' },
    { value: '219', label: 'D 站' },
    { value: '56', label: '中超' },
    { value: '120', label: '国际' },
    { value: '3', label: '英超' },
    { value: '5', label: '西甲' },
    { value: '4', label: '意甲' },
    { value: '6', label: '德甲' },
];
const ID_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/top_news/:id?',
    categories: ['sport'],
    example: '/dongqiudi/top_news/1',
    parameters: { id: { description: '类别 id，不填默认头条新闻', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['m.dongqiudi.com/home/:id'],
            target: '/top_news/:id',
        },
    ],
    name: '新闻',
    maintainers: ['HendricksZheng'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '类别 id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;
    const { data } = await got(`https://api.dongqiudi.com/app/tabs/web/${id}.json`);
    const articles = data.articles;
    const label = data.label;

    const list: Array<DataItem & { link: string; pubDate: Date }> = articles.map((item) => ({
        title: item.title,
        link: `https://www.dongqiudi.com/articles/${item.id}.html`,
        category: [item.category, ...(item.secondary_category ?? [])],
        pubDate: parseDate(item.show_time, 'X'),
    }));
    const out = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link, async () => {
                const { data: response } = await got(item.link);
                await processFeedType2(item, response);
                return item;
            }),
        { concurrency: 4 }
    );

    return {
        title: `懂球帝 - ${label}`,
        link: `https://www.dongqiudi.com/articlesList/${id}`,
        item: out.filter((e) => e !== undefined),
    };
}
