import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './common';

const ID_OPTIONS = [
    { value: 'movie', label: '影视' },
    { value: 'music', label: '音乐' },
    { value: 'game', label: '游戏' },
    { value: 'comic', label: '动漫' },
    { value: 'funny', label: '趣闻' },
    { value: 'science', label: '科学' },
    { value: 'soft', label: '软件' },
];

export const route: Route = {
    name: '分类',
    path: '/category/:id',
    example: '/cnbeta/category/movie',
    maintainers: ['nczitzk'],
    parameters: {
        id: { description: '分类 id，可在对应分类页的 URL 中找到', options: ID_OPTIONS },
    },
    radar: [
        {
            source: ['cnbeta.com.tw/category/:id', 'www.cnbeta.com.tw/category/:id'],
            target: '/category/:id',
        },
    ],
    handler,
    url: 'cnbeta.com.tw',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
};
