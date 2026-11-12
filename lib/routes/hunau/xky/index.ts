import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getContent } from '../utils/common';

const CATEGORY_OPTIONS = [
    { value: 'tzgg_8472', label: '通知公告' },
    { value: 'xyxw', label: '学院新闻' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg_8472';

export const route: Route = {
    path: '/xky/:category?',
    categories: ['university'],
    example: '/hunau/xky',
    parameters: { category: { description: '页面分类，默认为 `tzgg_8472`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['xky.hunau.edu.cn/'],
            target: '/xky',
        },
        {
            source: ['xky.hunau.edu.cn/tzgg_8472', 'xky.hunau.edu.cn/tzgg_8472/index.html'],
            target: '/xky',
        },
    ],
    name: '信息与智能科学技术学院',
    maintainers: ['lcandy2'],
    handler,
    url: 'xky.hunau.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '页面分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    return await getContent(ctx, {
        baseHost: 'https://xky.hunau.edu.cn',
        baseCategory: CATEGORY_OPTIONS_DEFAULT, // Default: notices
        baseTitle: '信息与智能科学技术学院',
        baseDescription: '湖南农业大学信息与智能科学技术学院',
        baseDeparment: 'xky',
        baseClass: 'div.right_list ul li:has(a)',
    });
}
