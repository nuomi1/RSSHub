import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: 'kjkxyjyyy', label: '空间科学研究与应用' },
    { value: 'htjssy', label: '航天技术试验' },
    { value: 'htyxsy', label: '航天医学实验' },
];

export const route: Route = {
    path: '/kjkx/:id',
    name: '空间科学',
    example: '/gov/cmse/kjkx/kjkxyjyyy',
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
            source: ['www.cmse.gov.cn/kjkx/:id'],
        },
    ],
    maintainers: ['nczitzk'],
    handler,
};
