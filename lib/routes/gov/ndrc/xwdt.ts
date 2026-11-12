import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'xwfb', label: '新闻发布' },
    { value: 'tzgg', label: '通知通告' },
    { value: 'wlddt', label: '委领导动态' },
    { value: 'sjdt', label: '司局动态' },
    { value: 'dfdt', label: '地方动态' },
];
const CATEGORY_OPTIONS_DEFAULT = 'xwfb';

export const route: Route = {
    path: '/xwdt/:category{.+}?',
    name: '新闻动态',
    example: '/gov/ndrc/xwdt',
    parameters: { category: { description: '分类，见下表，默认为新闻发布', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    maintainers: ['nczitzk'],
    categories: ['government'],
    handler,
    radar: [
        {
            title: '新闻发布',
            source: ['ndrc.gov.cn/xwdt/xwfb/', 'ndrc.gov.cn/xwdt/xwfb/*'],
            target: '/xwdt/xwfb',
        },
        {
            title: '通知通告',
            source: ['ndrc.gov.cn/xwdt/tzgg/', 'ndrc.gov.cn/xwdt/tzgg/*'],
            target: '/xwdt/tzgg',
        },
        {
            title: '委领导动态',
            source: ['ndrc.gov.cn/xwdt/dt/wlddt/', 'ndrc.gov.cn/xwdt/dt/wlddt/*'],
            target: '/xwdt/wlddt',
        },
        {
            title: '司局动态',
            source: ['ndrc.gov.cn/xwdt/dt/sjdt/', 'ndrc.gov.cn/xwdt/dt/sjdt/*'],
            target: '/xwdt/sjdt',
        },
        {
            title: '地方动态',
            source: ['ndrc.gov.cn/xwdt/dt/dfdt/', 'ndrc.gov.cn/xwdt/dt/dfdt/*'],
            target: '/xwdt/dfdt',
        },
    ],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;
    const limit = getRouteLimit(ctx, 25);
    const candidateLimit = ctx.req.query('sorted') === 'false' ? limit : Math.max(25, limit);

    const rootUrl = 'https://www.ndrc.gov.cn';
    const currentUrl = category.includes('dt') ? `${rootUrl}/xwdt/dt/${category}` : `${rootUrl}/xwdt/${category}`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);
    const list = $('.u-list li a')
        .slice(0, candidateLimit)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const link = new URL($item.attr('href')!, `${currentUrl}/`).href;
            return {
                title: $item.text(),
                link,
            };
        });

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(detailResponse.data);

                item.description = (content('.TRS_Editor').html() || content('.article_con').html() || '') + (content('.attachment').html() || '');
                const publishedDate = content('meta[name="PubDate"]').attr('content');
                if (publishedDate) {
                    item.pubDate = timezone(parseDate(publishedDate), 8);
                }

                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
