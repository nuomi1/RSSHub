import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: 'xwfbh', label: '新闻发布会' },
    { value: 'xsdh', label: '学术大会' },
    { value: 'bz', label: '标准' },
    { value: 'xwzt', label: '新闻专题' },
];

export const route: Route = {
    path: '/ztbd/:id',
    name: '专题报道',
    example: '/gov/cmse/ztbd/xwfbh',
    parameters: {
        id: { description: '分类 id，见下表，可在对应分类页 URL 中找到', options: ID_OPTIONS },
    },
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
    radar: [
        {
            source: ['www.cmse.gov.cn/ztbd/:id'],
        },
    ],
    maintainers: ['nczitzk'],
    handler,
};
