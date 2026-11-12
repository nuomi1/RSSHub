import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getContent } from '../utils/common';

const CATEGORY_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'xyyw', label: '学院要闻' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg';

export const route: Route = {
    path: '/gfxy/:category?',
    categories: ['university'],
    example: '/hunau/gfxy',
    parameters: { category: { description: '页面分类，默认为 `tzgg`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['gfxy.hunau.edu.cn/'],
            target: '/gfxy',
        },
        {
            source: ['gfxy.hunau.edu.cn/tzgg_0', 'gfxy.hunau.edu.cn/tzgg_0/index.html'],
            target: '/gfxy',
        },
        {
            source: ['gfxy.hunau.edu.cn/xyyw', 'gfxy.hunau.edu.cn/xyyw/index.html'],
            target: '/gfxy/xyyw',
        },
    ],
    name: '公共管理与法学学院',
    maintainers: ['lcandy2'],
    handler,
    url: 'gfxy.hunau.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '页面分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    return await getContent(ctx, {
        baseHost: 'https://gfxy.hunau.edu.cn',
        baseCategory: CATEGORY_OPTIONS_DEFAULT, // Default: notices
        baseTitle: '公共管理与法学学院',
        baseDescription: '湖南农业大学公共管理与法学学院',
        baseDeparment: 'gfxy',
        baseClass: 'div.right_list ul li:has(a)',
    });
}
