import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CATEGORY_OPTIONS = [
    { value: '', label: '首页' },
    { value: 'shipan', label: '老唐实盘' },
    { value: 'wenda', label: '书房拾遗' },
    { value: 'linian', label: '理念 & 估值' },
    { value: 'peidu', label: '经典陪读' },
    { value: 'taoli', label: '财务套利' },
    { value: 'qiye', label: '企业分析' },
    { value: 'baijiu', label: '白酒企业' },
    { value: 'tengxun', label: '腾讯控股' },
    { value: 'fenzhong', label: '分众传媒' },
    { value: 'haikang', label: '海康威视' },
    { value: 'qita', label: '其他企业' },
    { value: 'hexin', label: '核心五篇' },
    { value: 'tougao', label: '读者投稿' },
    { value: 'suibi', label: '读书随笔' },
    { value: 'caibao', label: '财报浅析' },
    { value: 'youji', label: '出行游记' },
    { value: 'bamang', label: '巴芒连载' },
];

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/tangshufang',
    parameters: { category: { description: '分类，见下表，默认为首页', options: CATEGORY_OPTIONS } },
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
            source: ['tangshufang.com/:category'],
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
    const category = ctx.req.param('category') ?? '';
    const limit = getRouteLimit(ctx, 10);

    const rootUrl = 'https://www.tangshufang.com';
    const currentUrl = `${rootUrl}${category ? `/${category}` : ''}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('article')
        .slice(0, limit)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            const a = $item.find('h2 a');

            return {
                title: a.text(),
                link: a.attr('href'),
                pubDate: parseDate($item.find('time').text()),
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                item.description = content('.wxsyncmain').html();
                item.category = content('a[rel="category tag"]')
                    .toArray()
                    .map((a) => content(a).text());

                return item;
            })
        )
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
