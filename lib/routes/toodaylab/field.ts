import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: '308', label: '快消' },
    { value: '307', label: '时尚' },
    { value: '306', label: '智能' },
    { value: '305', label: '娱乐' },
    { value: '304', label: '运动' },
    { value: '303', label: '生活' },
    { value: '302', label: '设计' },
    { value: '301', label: '出行' },
];

export const route: Route = {
    path: '/field/:id',
    categories: ['new-media'],
    example: '/toodaylab/field/308',
    parameters: { id: { description: '领域 id，见下表，可在对应领域页 URL 中找到', options: ID_OPTIONS } },
    radar: [
        {
            source: ['toodaylab.com/field/:id'],
            target: '/field/:id',
        },
    ],
    name: '领域',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '领域 id',
        options: ID_OPTIONS,
    }),
    maintainers: ['nczitzk'],
    handler,
};
