import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import parseList from './utils';

const TYPE_OPTIONS = [
    { value: 'tzgg', label: '通知公告 (<https://news.hfut.edu.cn/tzgg2.htm>)' },
    { value: 'jxky', label: '教学科研 (<https://news.hfut.edu.cn/tzgg2/jxky.htm>)' },
    { value: 'qttz', label: '其他通知 (<https://news.hfut.edu.cn/tzgg2/qttz.htm>)' },
];
const TYPE_OPTIONS_DEFAULT = 'tzgg';

export const route: Route = {
    path: '/hf/notice/:type?',
    categories: ['university'],
    example: '/hfut/hf/notice/tzgg',
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
            source: ['news.hfut.edu.cn'],
        },
    ],
    name: '合肥校区通知',
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
        description: '合肥工业大学 - 通知公告',
        item: resultList,
    };
}
