import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getWafTokenId, ProcessItem, rootUrl } from './utils';

const CATEGORY_OPTIONS = [
    { value: '24', label: '24 小时热榜' },
    { value: 'renqi', label: '资讯人气榜' },
    { value: 'zonghe', label: '资讯综合榜' },
    { value: 'shoucang', label: '资讯收藏榜' },
];
const CATEGORY_OPTIONS_DEFAULT = '24';

const categories = {
    24: {
        title: '24小时热榜',
        key: 'homeData.data.hotlist.data',
    },
    renqi: {
        title: '资讯人气榜',
        key: 'hotListData.topList',
    },
    zonghe: {
        title: '资讯综合榜',
        key: 'hotListData.hotList',
    },
    shoucang: {
        title: '资讯综合榜',
        key: 'hotListData.collectList',
    },
};

export const route: Route = {
    path: '/hot-list/:category?',
    categories: ['new-media'],
    example: '/36kr/hot-list',
    parameters: { category: { description: '分类，默认为24小时热榜', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['36kr.com/hot-list/:category', '36kr.com/'],
            target: '/hot-list/:category',
        },
    ],
    name: '资讯热榜',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

const getProperty = (object, key) => {
    let result = object;
    const keys = key.split('.');
    for (const k of keys) {
        result &&= result[k];
    }
    return result;
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    if (!Object.hasOwn(categories, category)) {
        throw new InvalidParameterError('This category does not exist. Please refer to the documentation for the correct usage.');
    }

    const currentUrl = category === '24' ? rootUrl : `${rootUrl}/hot-list/catalog`;

    const wafTokenId = await getWafTokenId();
    const response = await got({
        method: 'get',
        url: currentUrl,
        headers: wafTokenId
            ? {
                  Cookie: `_waftokenid=${wafTokenId}`,
              }
            : undefined,
    });

    const data = getProperty(JSON.parse(response.data.match(/window.initialState=(\{.*\})/)[1]), categories[category].key);

    let items = data
        .slice(0, getRouteLimit(ctx, 10))
        .filter((item) => item.itemType !== 0)
        .map((item) => {
            item = item.templateMaterial ?? item;
            return {
                title: item.widgetTitle.replaceAll(/<\/?em>/g, ''),
                author: item.authorName,
                pubDate: parseDate(item.publishTime),
                link: `${rootUrl}/p/${item.itemId}`,
                description: item.summary,
            };
        });

    items = await Promise.all(items.map((item) => ProcessItem(item)));

    return {
        title: `36氪 - ${categories[category].title}`,
        link: currentUrl,
        item: items,
    };
}
