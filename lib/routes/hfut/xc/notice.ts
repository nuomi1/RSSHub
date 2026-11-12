import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import parseList from './utils';

const TYPE_OPTIONS = [
    { value: 'tzgg', label: '通知公告 (<https://xc.hfut.edu.cn/1955/list.htm>)' },
    { value: 'gztz', label: '院系动态 - 工作通知 (<https://xc.hfut.edu.cn/gztz/list.htm>)' },
];
const TYPE_OPTIONS_DEFAULT = 'tzgg';

export const route: Route = {
    path: '/xc/notice/:type?',
    categories: ['university'],
    example: '/hfut/xc/notice/tzgg',
    parameters: { type: { description: '分类，见下表（默认为 `tzgg`)', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportRadar: true,
        supportScihub: false,
    },
    radar: [
        {
            source: ['xc.hfut.edu.cn'],
        },
    ],
    name: '宣城校区通知',
    maintainers: ['batemax'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    // set default router type
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;

    const { link, title, resultList } = await parseList(ctx, type);

    return {
        title,
        link,
        description: '合肥工业大学宣城校区 - 通知公告',
        item: resultList,
    };
}
