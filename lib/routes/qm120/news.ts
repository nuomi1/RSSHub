import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'jdxw', label: '健康焦点' },
    { value: 'hydt', label: '行业动态' },
    { value: 'yxqy', label: '医学前沿' },
    { value: 'fgdt', label: '法规动态' },
    { value: 'spaq', label: '食品安全' },
    { value: 'ylsg', label: '医疗事故' },
    { value: 'yyhz', label: '医药会展' },
    { value: 'yyxx', label: '医药信息' },
    { value: 'zhuanti', label: '新闻专题' },
    { value: 'xyxw', label: '行业新闻' },
];
const CATEGORY_OPTIONS_DEFAULT = 'jdxw';

export const route: Route = {
    path: '/news/:category?',
    categories: ['new-media'],
    example: '/qm120/news',
    parameters: { category: { description: '分类，见下表，默认为健康焦点', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['qm120.com/'],
        },
    ],
    name: '新闻',
    maintainers: ['nczitzk'],
    handler,
    url: 'qm120.com/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'http://www.qm120.com';
    const currentUrl = `${rootUrl}/news/${category}`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('.lb2boxls ul li a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: $item.attr('href'),
            };
        });

    items = await pMap(
        items,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(detailResponse.data);

                item.description = content('.neirong_body').html();
                item.pubDate = timezone(parseDate(content('.neirong_head p span').eq(1).text()), 8);

                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: `${$('.zt_liebiao_tit').text()} - 全民健康网`,
        link: currentUrl,
        item: items,
    };
}
