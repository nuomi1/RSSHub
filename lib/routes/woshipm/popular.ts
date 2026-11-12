import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { baseUrl, parseArticle } from './utils';

const rangeMap = {
    daily: '日榜',
    weekly: '周榜',
    monthly: '月榜',
};

const RANGE_OPTIONS = Object.entries(rangeMap).map(([value, label]) => ({ value, label }));
const RANGE_OPTIONS_DEFAULT = 'daily';

function parsePublicationTime(value?: number) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        return;
    }
    const date = parseDate(value, 'x');
    return Number.isNaN(date.getTime()) ? undefined : date;
}

const parseArticleResult = async (item: DataItem) => {
    const [result] = await Promise.allSettled([parseArticle(item)]);
    return result;
};

export const route: Route = {
    path: '/popular/:range?',
    categories: ['new-media'],
    example: '/woshipm/popular',
    parameters: { range: { description: '时间，见下表，默认为 `daily`', options: RANGE_OPTIONS, default: RANGE_OPTIONS_DEFAULT } },
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
            source: ['woshipm.com/'],
            target: '/popular',
        },
    ],
    name: '热门文章',
    maintainers: ['WenryXu'],
    handler,
    url: 'woshipm.com/',
    description: renderOptionsMarkdownTable({
        parameter: 'range',
        description: '时间',
        options: RANGE_OPTIONS,
    }),
};

async function handler(ctx) {
    const { range = RANGE_OPTIONS_DEFAULT } = ctx.req.param();
    const { data: response } = await got(`${baseUrl}/api2/app/article/popular/${range}`);

    const list = response.RESULT.map((item) => {
        item = item.data;
        return {
            title: item.articleTitle,
            description: item.articleSummary,
            link: `${baseUrl}/${item.type || 'ai'}/${item.id}.html`,
            pubDate: parsePublicationTime(item.publishTime),
            author: item.articleAuthor,
        };
    });

    const results = await pMap(list, parseArticleResult, { concurrency: 3 });
    const result = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);

    return {
        title: `热门文章 - ${rangeMap[range]} - 人人都是产品经理`,
        link: baseUrl,
        item: result,
    };
}
