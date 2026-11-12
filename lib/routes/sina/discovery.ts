import pMap from 'p-map';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getRollNewsList, parseArticle, parseRollNewsList } from './utils';

const TYPE_OPTIONS = [
    { value: 'zx', label: '最新' },
    { value: 'twhk', label: '天文航空' },
    { value: 'dwzw', label: '动物植物' },
    { value: 'zrdl', label: '自然地理' },
    { value: 'lskg', label: '历史考古' },
    { value: 'smyx', label: '生命医学' },
    { value: 'shbk', label: '生活百科' },
    { value: 'kjqy', label: '科技前沿' },
];

const link = 'https://tech.sina.com.cn/discovery/';
const map = new Map([
    ['zx', { title: '最新', id: '1795' }],
    ['twhk', { title: '天文航空', id: '1796' }],
    ['dwzw', { title: '动物植物', id: '1797' }],
    ['zrdl', { title: '自然地理', id: '1798' }],
    ['lskg', { title: '历史考古', id: '1799' }],
    ['smyx', { title: '生命医学', id: '1800' }],
    ['shbk', { title: '生活百科', id: '1801' }],
    ['kjqy', { title: '科技前沿', id: '1802' }],
]);

export const route: Route = {
    path: '/discovery/:type',
    categories: ['new-media'],
    example: '/sina/discovery/zx',
    parameters: { type: { description: '订阅分区类型，见下表', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '科技 - 科学探索',
    maintainers: ['LogicJake'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '订阅分区类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type');
    const lid = map.get(type)!.id;
    const title = map.get(type)!.title;
    const pageid = '207';
    const limit = getRouteLimit(ctx, 50);

    const response = await getRollNewsList(pageid, lid, limit);
    const list = parseRollNewsList(response.data.result.data);

    const out = await pMap(list, parseArticle, { concurrency: 3 });

    return {
        title: `${title}-新浪科技科学探索`,
        link,
        item: out,
    };
}
