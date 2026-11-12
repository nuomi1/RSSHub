import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: 'kphd', label: '科普活动' },
    { value: 'tkkt', label: '太空课堂' },
    { value: 'ttzs', label: '航天知识' },
];

export const route: Route = {
    path: '/kpjy/:id',
    name: '科普教育',
    example: '/gov/cmse/kpjy/kphd',
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
            source: ['www.cmse.gov.cn/kpjy/:id'],
        },
    ],
    maintainers: ['nczitzk'],
    handler,
};
