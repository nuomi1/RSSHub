import pMap from 'p-map';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { apiRootUrl, parseArticle, parseResult, rootUrl } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'method', label: '方法' },
    { value: 'opinion', label: '观点' },
];
const CATEGORY_OPTIONS_DEFAULT = 'method';

export const route: Route = {
    path: '/category/:category?',
    categories: ['new-media'],
    example: '/utgd/category/method',
    parameters: { category: { description: '分类，可在对应分类页的 URL 中找到，默认为方法', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['utgd.net/category/s/:category'],
            target: '/category/:category',
        },
        {
            source: ['utgd.net/'],
            target: '/category',
        },
    ],
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    const limit = getRouteLimit(ctx, 9);

    const apiUrl = `${apiRootUrl}/api/v2/categories`;
    const currentUrl = `${rootUrl}/category/s/${category}`;
    const slugUrl = `${apiRootUrl}/api/v2/category/slug/${category}/`;

    const categoryData = await ofetch(slugUrl);

    const response = await ofetch(`${apiUrl}/${categoryData.id}/related_articles`, {
        query: {
            page: 1,
            page_size: limit,
        },
    });

    const list = parseResult(response.results, limit);

    const items = await pMap(list, parseArticle, { concurrency: 3 });

    return {
        title: `UNTAG - ${categoryData.category_name}`,
        link: currentUrl,
        item: items,
        image: categoryData.category_image,
        description: categoryData.category_description,
    };
}
