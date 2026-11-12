import type { Route } from '@/types';
import { ViewType } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getArticleItems, rootUrl } from './utils';

const CATEGORY_OPTIONS = [
    { value: '', label: '全部' },
    { value: '2040', label: '行业 & 项目观察' },
    { value: '2046', label: '项目简介' },
    { value: '2047', label: '项目动态' },
    { value: '2045', label: '赛道解读' },
    { value: '2044', label: '播客笔记' },
    { value: '2043', label: '交易观察' },
    { value: '2042', label: 'VC 洞察' },
    { value: '2041', label: '实用教程' },
    { value: '2039', label: '人物故事 & 访谈' },
    { value: '2033', label: '法律 & 监管动态' },
    { value: '2032', label: '活动动态' },
    { value: '2031', label: '交易所动态' },
];

export const route: Route = {
    path: '/featured/:category?',
    categories: ['finance'],
    view: ViewType.Articles,
    example: '/techflowpost/featured',
    parameters: {
        category: { description: '分类，见下表，默认为全部', options: CATEGORY_OPTIONS },
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['techflowpost.com/zh-CN/article'],
        },
    ],
    name: '精选',
    maintainers: ['zhenlohuang'],
    handler,
    url: 'techflowpost.com/zh-CN/article',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

const categoryMap = {
    '2040': '行业 & 项目观察',
    '2046': '项目简介',
    '2047': '项目动态',
    '2045': '赛道解读',
    '2044': '播客笔记',
    '2043': '交易观察',
    '2042': 'VC洞察',
    '2041': '实用教程',
    '2039': '人物故事 & 访谈',
    '2033': '法律 & 监管动态',
    '2032': '活动动态',
    '2031': '交易所动态',
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';
    const limit = getRouteLimit(ctx, 50);
    const currentUrl = `${rootUrl}/zh-CN/article`;
    const items = await getArticleItems({
        category,
        limit,
    });

    const categoryName = category && Object.hasOwn(categoryMap, category) ? `（${categoryMap[category]}）` : '';

    return {
        title: `深潮TechFlow - 精选文章${categoryName}`,
        link: currentUrl,
        item: items,
    };
}
