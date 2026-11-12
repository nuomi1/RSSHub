import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: '3157', label: '学校要闻' },
    { value: '3187', label: '通知' },
    { value: '3188', label: '学术讲座' },
    { value: '3185', label: '基层风采书院' },
    { value: '3186', label: '基层风采院系' },
    { value: '3199', label: '外媒报道' },
    { value: '3200', label: '三全学院报' },
];
const CATEGORY_OPTIONS_DEFAULT = '3157';

export const route: Route = {
    path: '/www/:category?',
    categories: ['university'],
    example: '/sqmc/www/3157',
    parameters: { category: { description: '分类ID，默认为`3157`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['sqmc.edu.cn/:category/list.htm'],
        },
    ],
    name: '官网信息',
    maintainers: ['nyaShine'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类ID',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'https://www.sqmc.edu.cn';
    const currentUrl = `${rootUrl}/${category}/list.htm`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);
    const list = $('.news_box .news_title a[href]').toArray();

    return {
        title: `豫北医学院官网信息${$('title').text()}`,
        link: currentUrl,
        item: await pMap(
            list,
            async (item) => {
                const $item = $(item);

                const link = new URL($item.attr('href')!, rootUrl).href;
                const pubDate = parseDate($item.closest('.news_box').find('.news_meta').text().trim(), 'YYYY-MM-DD');

                const cacheIn = await cache.tryGet(`sqmc:body:v2:${link}`, async () => {
                    const detailResponse = await got({
                        method: 'get',
                        url: link,
                    });
                    const content = load(detailResponse.data);

                    return {
                        description: content('.wp_articlecontent').html(),
                    };
                });

                return {
                    title: $item.attr('title') || $item.text(),
                    link,
                    pubDate: timezone(pubDate, 8),
                    ...cacheIn,
                };
            },
            { concurrency: 3 }
        ),
    };
}
