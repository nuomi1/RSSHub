import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: 'zxdta', label: '最新动态' },
    { value: 'mg', label: '美国' },
    { value: 'els', label: '俄罗斯' },
    { value: 'oz', label: '欧洲' },
    { value: 'rb', label: '日本' },
    { value: 'yd', label: '印度' },
    { value: 'lydt', label: '领域动态' },
];

export const route: Route = {
    path: '/hqsy/:id',
    name: '环球视野',
    example: '/gov/cmse/hqsy/zxdta',
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
            source: ['www.cmse.gov.cn/hqsy/:id'],
        },
    ],
    maintainers: ['nczitzk'],
    handler,
};
