import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: '309', label: '今日消费资讯' },
    { value: '37', label: '实验室带你过周末' },
    { value: '40', label: '实验室带你过假期' },
    { value: '32', label: '每日一图' },
    { value: '33', label: '每周一书' },
    { value: '310', label: '实验室数字' },
    { value: '316', label: '新鲜社会人' },
    { value: '476', label: '实验室 TV' },
];

export const route: Route = {
    path: '/topic/:id',
    categories: ['new-media'],
    example: '/toodaylab/topic/309',
    parameters: { id: { description: '话题 id，见下表，可在对应话题页 URL 中找到', options: ID_OPTIONS } },
    features: {
        antiCrawler: true,
    },
    radar: [
        {
            source: ['toodaylab.com/topic/:id'],
            target: '/topic/:id',
        },
    ],
    name: '话题',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '话题 id',
        options: ID_OPTIONS,
    }),
    maintainers: ['nczitzk'],
    handler,
};
