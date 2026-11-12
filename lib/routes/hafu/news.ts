import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { parseList } from './utils';

const TYPE_OPTIONS = [
    { value: 'ggtz', label: '校内公告通知' },
    { value: 'jwc', label: '教务处公告通知' },
    { value: 'zsjyc', label: '招生就业处公告通知' },
];
const TYPE_OPTIONS_DEFAULT = 'ggtz';

export const route: Route = {
    path: '/news/:type?',
    categories: ['university'],
    example: '/hafu/news/ggtz',
    parameters: { type: { description: '分类，见下表（默认为 `ggtz`)', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '公告通知',
    maintainers: ['deep1nlife'],
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
        description: '河南财政金融学院 - 公告通知',
        item: resultList,
    };
}
