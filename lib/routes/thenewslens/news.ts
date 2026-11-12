import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const SORT_OPTIONS = [
    { value: '', label: '最新文章' },
    { value: 'hot', label: '最多觀看' },
    { value: 'social', label: '最多分享' },
];

export const route: Route = {
    path: '/news/:sort{.+}?',
    categories: ['new-media'],
    example: '/thenewslens/news',
    parameters: { sort: { description: '排序方式，见下表，可在对应排序页 URL 中找到', options: SORT_OPTIONS } },
    description: renderOptionsMarkdownTable({
        parameter: 'sort',
        description: '排序方式',
        options: SORT_OPTIONS,
    }),
    radar: [
        {
            source: ['thenewslens.com/news/*sort', 'thenewslens.com/news', 'thenewslens.com/'],
            target: '/news/:sort?',
        },
    ],
    name: '新闻',
    maintainers: ['nczitzk'],
    handler,
};
