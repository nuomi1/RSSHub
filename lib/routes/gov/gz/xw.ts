import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const CATEGORY_OPTIONS = [
    { value: 'gzyw', label: '广州要闻' },
    { value: 'jrtt', label: '今日头条' },
    { value: 'tzgg', label: '通知公告' },
];

export const route: Route = {
    path: '/xw/:category',
    name: '新闻',
    example: '/gov/gz/xw/gzyw',
    parameters: { category: { description: '新闻分类', options: CATEGORY_OPTIONS } },
    radar: [
        {
            source: ['www.gz.gov.cn/xw/:category'],
        },
    ],
    maintainers: ['drgnchan'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '新闻分类',
        options: CATEGORY_OPTIONS,
    }),
};
