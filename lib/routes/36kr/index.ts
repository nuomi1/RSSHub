import { load } from 'cheerio';

import type { Route } from '@/types';
import { getSubPath } from '@/utils/common-utils';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getInitialState, ProcessItem, rootUrl } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'news', label: '最新资讯频道' },
    { value: 'newsflashes', label: '快讯' },
    { value: 'recommend', label: '推荐资讯' },
    { value: 'life', label: '生活' },
    { value: 'estate', label: '房产' },
    { value: 'workplace', label: '职场' },
    { value: 'search/articles/ 关键词', label: '搜索文章' },
    { value: 'search/newsflashes/ 关键词', label: '搜索快讯' },
];

const shortcuts = {
    '/information': '/information/web_news',
    '/information/latest': '/information/web_news',
    '/information/recommend': '/information/web_recommend',
    '/information/life': '/information/happy_life',
    '/information/estate': '/information/real_estate',
    '/information/workplace': '/information/web_zhichang',
};

const findItemList = (state): any[] | undefined => {
    if (!state || typeof state !== 'object') {
        return;
    }
    if (Array.isArray(state.itemList)) {
        return state.itemList;
    }
    for (const value of Object.values(state)) {
        const itemList = findItemList(value);
        if (itemList) {
            return itemList;
        }
    }
};

export const route: Route = {
    path: '/:category/:subCategory?/:keyword?',
    categories: ['new-media'],
    example: '/36kr/newsflashes',
    parameters: {
        category: { description: '分类，必填项', options: CATEGORY_OPTIONS },
        subCategory: '子分类，选填项，目的是为了兼容老逻辑',
        keyword: '关键词，选填项，仅搜索文章/快讯时有效',
    },
    name: '资讯, 快讯, 用户文章, 主题文章, 专题文章, 搜索文章, 搜索快讯',
    maintainers: ['nczitzk', 'fashioncj'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx) {
    const path = getSubPath(ctx)
        .replace(/^\/news(?!flashes)/, '/information')
        .replace(/^\/search\/article(?=\/|$)/, '/search/articles');

    const currentUrl = `${rootUrl}${Object.hasOwn(shortcuts, path) ? shortcuts[path] : path}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const data = findItemList(getInitialState(response.data));
    if (!data) {
        throw new Error('36kr page does not contain an article list. Please check the source page.');
    }

    let items = data
        .slice(0, getRouteLimit(ctx, 30))
        .filter((item) => item.itemType !== 0)
        .map((item) => {
            item = item.templateMaterial ?? item;
            return {
                title: item.widgetTitle.replaceAll(/<\/?em>/g, ''),
                author: item.author,
                pubDate: parseDate(item.publishTime),
                link: `${rootUrl}/${path === '/newsflashes' || path.startsWith('/search/newsflashes/') ? 'newsflashes' : 'p'}/${item.itemId}`,
                description: item.widgetContent ?? item.content,
            };
        });

    if (!/^\/(?:search|newsflashes)/.test(path)) {
        items = await Promise.all(items.map((item) => ProcessItem(item)));
    }

    return {
        title: `36氪 - ${$('title').text().split('_', 1)[0]}`,
        link: currentUrl,
        item: items,
    };
}
