import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { ProcessItems, rootUrl } from './utils';

const CATEGORY_OPTIONS = [
    { value: '1', label: '清纯唯美' },
    { value: '2', label: '摄影私房' },
    { value: '4', label: '明星写真' },
    { value: '5', label: '三次元' },
    { value: '6', label: '异域美景' },
    { value: '7', label: '性感妖姬' },
    { value: '9', label: '游戏主题' },
    { value: '11', label: '美女壁纸' },
];

export const route: Route = {
    path: '/category/:category',
    categories: ['picture'],
    example: '/95mm/category/1',
    parameters: { category: { description: '集合，见下表', options: CATEGORY_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
        nsfw: true,
    },
    radar: [
        {
            source: ['95mm.org/'],
        },
    ],
    name: '集合',
    maintainers: ['nczitzk'],
    handler,
    url: '95mm.org/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '集合',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const categories = {
        1: '清纯唯美',
        2: '摄影私房',
        4: '明星写真',
        5: '三次元',
        6: '异域美景',
        7: '性感妖姬',
        9: '游戏主题',
        11: '美女壁纸',
    };

    const category = ctx.req.param('category');

    const currentUrl = `${rootUrl}/category-${category}/list-1/index.html?page=1`;

    return await ProcessItems(ctx, categories[category], currentUrl);
}
