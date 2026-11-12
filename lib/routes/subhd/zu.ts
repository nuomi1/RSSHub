import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const CATEGORY_OPTIONS = [
    { value: '14', label: 'YYeTs 字幕组' },
    { value: '28', label: 'F.I.X 字幕侠' },
    { value: '2', label: '深影字幕组' },
    { value: '118', label: '擦枪字幕组' },
    { value: '132', label: '哒哒字幕组' },
    { value: '20', label: '迪幻字幕组' },
    { value: '1', label: '伊甸园字幕组' },
    { value: '18', label: 'H-SGDK 字幕组' },
    { value: '71', label: '蓝血字幕组' },
    { value: '11', label: 'GA 字幕组' },
    { value: '75', label: 'CC 标准电影字幕组' },
    { value: '130', label: 'NEW 字幕组' },
    { value: '66', label: 'Orange 字幕组' },
    { value: '19', label: '圣城家园 SCG 字幕组' },
    { value: '10', label: '纪录片之家字幕组' },
];
const CATEGORY_OPTIONS_DEFAULT = 'YYeTs';

export const route: Route = {
    path: '/zu/:category?',
    categories: ['multimedia'],
    example: '/subhd/zu/14',
    parameters: { category: { description: '字幕组，见下表，默认为 YYeTs字幕组', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['subhd.tv/zu/:category', 'subhd.tv/zu/:category/l', 'subhd.tv/'],
            target: '/zu/:category?',
        },
    ],
    name: '字幕组',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '字幕组',
        options: CATEGORY_OPTIONS,
    }),
    maintainers: ['nczitzk'],
    handler,
};
