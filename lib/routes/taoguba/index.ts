import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getPage, renderPostDetail, rootUrl } from './util';

const CATEGORY_OPTIONS = [
    { value: 'bbs', label: '淘股论坛' },
    { value: 'zongban', label: '社区总版' },
    { value: 'jinghua', label: '精华加油' },
    { value: 'dianzan', label: '网友点赞' },
];
const CATEGORY_OPTIONS_DEFAULT = 'zongban';

export const route: Route = {
    path: '/:category?',
    categories: ['finance'],
    example: '/taoguba',
    parameters: { category: { description: '分类，见下表，默认为社区总版', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: [
            {
                name: 'TAOGUBA_COOKIE',
                optional: true,
                description: 'Your own www.tgb.cn Cookie for articles that require login. Anonymous excerpts remain available without it.',
            },
        ],
    },
    name: '淘股论坛',
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

    const currentUrl = `${rootUrl}/${category}/`;

    const response = await getPage(currentUrl);

    const $ = load(response.data);

    let items = $('.Nbbs-tiezi-lists')
        .slice(0, getRouteLimit(ctx, 70))
        .toArray()
        .map((item) => {
            const $item = $(item);

            const a = $item.find('.middle-list-tittle a');

            const href = a.attr('href');
            if (!href) {
                return;
            }
            return {
                title: a.attr('title') || a.text(),
                link: new URL(href, rootUrl).href,
                author: $item.find('.middle-list-user a').text().trim(),
            };
        })
        .filter((item) => item !== undefined);

    items = await pMap(items, renderPostDetail, { concurrency: 3 });

    return {
        title: $('head title').text().trim().split('_', 1)[0],
        link: currentUrl,
        item: items,
    };
}
