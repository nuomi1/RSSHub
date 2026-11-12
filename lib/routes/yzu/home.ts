import type { Context } from 'hono';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { fetchList } from './utils';

const TYPE_OPTIONS = [
    { value: 'xxyw', label: '学校要闻' },
    { value: 'xyxw', label: '校园新闻' },
    { value: 'xxgg', label: '信息公告' },
    { value: 'xshd', label: '学术活动' },
    { value: 'mtyd', label: '媒体扬大' },
];

const map = new Map([
    ['xxyw', '学校要闻'],
    ['xyxw', '校园新闻'],
    ['xxgg', '信息公告'],
    ['xshd', '学术活动'],
    ['mtyd', '媒体扬大'],
]);

export const route: Route = {
    path: '/home/:type',
    categories: ['university'],
    example: '/yzu/home/xxyw',
    parameters: { type: { description: '分类名', options: TYPE_OPTIONS } },
    features: {
        requirePuppeteer: true,
        antiCrawler: true,
    },
    radar: [
        {
            source: ['www.yzu.edu.cn/dtxx/:type.htm'],
            target: '/home/:type',
        },
    ],
    name: '官网消息',
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
    const limit = getRouteLimit(ctx, 10);
    const link = `https://www.yzu.edu.cn/dtxx/${type}.htm`;

    const items = await fetchList(link, limit);

    return {
        title: `扬州大学 -- ${map.get(type)}`,
        link,
        description: '扬州大学 RSS',
        item: items,
    };
}
