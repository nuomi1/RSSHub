import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getMzzlbg } from './utils/mzzlbg';
import { getNews } from './utils/news';
import { xinwen1j1 } from './utils/xinwen1j1';
import getXWLB from './xwlb';

const CATEGORY_OPTIONS = [
    { value: 'news', label: '新闻' },
    { value: 'china', label: '国内' },
    { value: 'world', label: '国际' },
    { value: 'society', label: '社会' },
    { value: 'law', label: '法治' },
    { value: 'ent', label: '文娱' },
    { value: 'tech', label: '科技' },
    { value: 'life', label: '生活' },
    { value: 'edu', label: '教育' },
    { value: 'mzzlbg', label: '每周质量报告' },
    { value: 'xinwen1j1', label: '新闻 1+1' },
];

export const route: Route = {
    path: '/:category',
    categories: ['traditional-media'],
    example: '/cctv/world',
    parameters: { category: { description: '分类名', options: CATEGORY_OPTIONS } },
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
            source: ['news.cctv.com/:category'],
        },
    ],
    name: '专题',
    maintainers: ['idealclover', 'xyqfer'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');

    switch (category) {
        case 'mzzlbg':
            return await getMzzlbg(ctx);

        case 'xinwen1j1':
            return await xinwen1j1(ctx);

        case 'xwlb':
            return await getXWLB(ctx);

        default:
            return await getNews(category, ctx);
    }
}
