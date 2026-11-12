import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: '299', label: '专题' },
    { value: '300', label: '攻略' },
];

export const route: Route = {
    path: '/column/:id',
    categories: ['new-media'],
    example: '/toodaylab/column/299',
    parameters: { id: { description: '专栏 id，见下表，可在对应专栏页 URL 中找到', options: ID_OPTIONS } },
    radar: [
        {
            source: ['toodaylab.com/column/:id'],
            target: '/column/:id',
        },
    ],
    name: '专栏',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '专栏 id',
        options: ID_OPTIONS,
    }),
    maintainers: ['nczitzk'],
    handler,
};
