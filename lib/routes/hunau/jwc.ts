import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getContent } from './utils/common';

const CATEGORY_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'jwdt', label: '教务动态' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg';

export const route: Route = {
    path: '/jwc/:category?',
    categories: ['university'],
    example: '/hunau/jwc',
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
            source: ['jwc.hunau.edu.cn/'],
            target: '/jwc',
        },
        {
            source: ['jwc.hunau.edu.cn/tzgg', 'jwc.hunau.edu.cn/tzgg/index.html'],
            target: '/jwc',
        },
        {
            source: ['jwc.hunau.edu.cn/jwdt', 'jwc.hunau.edu.cn/jwdt/index.html'],
            target: '/jwc/jwdt',
        },
    ],
    name: '教务处',
    maintainers: ['lcandy2'],
    handler,
    url: 'jwc.hunau.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '页面分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    return await getContent(ctx, {
        baseHost: 'https://jwc.hunau.edu.cn',
        baseCategory: CATEGORY_OPTIONS_DEFAULT, // Default: notices
        baseTitle: '湖南农业大学教务处',
        baseDeparment: 'jwc',
        baseClass: 'main .collection .single_one:has(a)',
    });
}
