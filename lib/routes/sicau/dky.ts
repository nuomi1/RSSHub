import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'xydt', label: '学院动态' },
    { value: 'jxgl', label: '教学管理' },
    { value: 'dkdjt', label: '动科大讲堂' },
    { value: 'zpxx', label: '就业信息' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg';

export const route: Route = {
    path: '/dky/:category?',
    categories: ['university'],
    example: '/sicau/dky/tzgg',
    parameters: { category: { description: '分类，见下表，默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['dky.sicau.edu.cn/'],
        },
    ],
    name: '动物科技学院',
    maintainers: ['nczitzk'],
    handler,
    url: 'dky.sicau.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'https://dky.sicau.edu.cn';
    const currentUrl = `${rootUrl}/${category}.htm`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const list = $('a.tit')
        .slice(0, 10)
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);

            return {
                title: $item.attr('title') || $item.text(),
                link: `${rootUrl}/${$item.attr('href')}`,
                pubDate: timezone(parseDate($item.prev().text(), 'YYYY-MM-DD'), 8),
            };
        });

    const items = await pMap(
        list,
        async (item) => {
            const details = await cache.tryGet(`sicau:dky:v2:${item.link}`, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(detailResponse.data);

                item.description = content('.v_news_content').html();

                return { description: item.description };
            });
            return { ...item, ...details };
        },
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
