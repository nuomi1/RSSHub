import type { Context } from 'hono';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { fetchList } from './utils';

const TYPE_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'bszs', label: '博士研究生招生' },
    { value: 'sszs', label: '硕士研究生招生' },
];

const map = new Map([
    ['tzgg', { title: '通知公告', page: 'tzgg' }],
    ['bszs', { title: '博士研究生招生', page: 'bsyjszs' }],
    ['sszs', { title: '硕士研究生招生', page: 'ssyjszs' }],
]);

export const route: Route = {
    path: '/yjszs/:type',
    categories: ['university'],
    example: '/yzu/yjszs/tzgg',
    parameters: { type: { description: '分类名', options: TYPE_OPTIONS } },
    features: {
        requirePuppeteer: true,
        antiCrawler: true,
    },
    radar: [
        {
            title: '通知公告',
            source: ['yjszs.yzu.edu.cn/tzgg/tzgg.htm'],
            target: '/yjszs/tzgg',
        },
        {
            title: '博士研究生招生',
            source: ['yjszs.yzu.edu.cn/tzgg/bsyjszs.htm'],
            target: '/yjszs/bszs',
        },
        {
            title: '硕士研究生招生',
            source: ['yjszs.yzu.edu.cn/tzgg/ssyjszs.htm'],
            target: '/yjszs/sszs',
        },
    ],
    name: '研究生招生',
    maintainers: ['LogicJake'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类名',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    const { type } = ctx.req.param();
    const { title, page } = map.get(type)!;
    const limit = getRouteLimit(ctx, 10);
    const link = `https://yjszs.yzu.edu.cn/tzgg/${page}.htm`;

    const items = await fetchList(link, limit);

    return {
        title: `扬州大学研究生招生 -- ${title}`,
        link,
        description: '扬州大学研究生招生 RSS',
        item: items,
    };
}
