import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import got, { parseCampusDate } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'xwkx', label: '新闻快讯' },
    { value: 'tzgg', label: '通知公告' },
    { value: 'jwxx', label: '教务信息' },
    { value: 'kydt', label: '科研动态' },
    { value: 'xzfc', label: '学子风采' },
];
const CATEGORY_OPTIONS_DEFAULT = 'xwkx';

const baseTitle = 'NUIST CS（南信大计软院）';
const baseUrl = 'https://scs.nuist.edu.cn';

export const route: Route = {
    path: '/scs/:category?',
    categories: ['university'],
    example: '/nuist/scs/xwkx',
    parameters: { category: { description: '默认为新闻快讯', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['scs.nuist.edu.cn/:category/list.htm'],
            target: '/scs/:category',
        },
    ],
    name: 'NUIST CS（南信大计软院）',
    maintainers: ['gylidian'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `${baseUrl}/${category}/list.htm`;

    const response = await got(link);
    const $ = load(response.data);

    const list = $('ul.news_list')
        .eq(0)
        .find('li')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            return {
                title: $item.find('.news_title a').attr('title')!,
                link: new URL($item.find('.news_title a').attr('href')!, baseUrl).href,
                pubDate: parseCampusDate($item.find('.news_meta').text()),
            };
        });

    const items = await pMap(
        list,
        async (item) => ({
            ...item,
            ...(await cache.tryGet(item.link + ':content', async () => {
                const response = await got(item.link);
                const $ = load(response.data);
                const authorMatch = $('.arti_metas')
                    .text()
                    .match(/发布者：(.*)发布时间/);
                return { author: authorMatch ? authorMatch[1].trim() : undefined, description: $('.entry').html() };
            })),
        }),
        { concurrency: 3 }
    );

    return {
        title: baseTitle + '：' + $('head title').text(),
        description: $('meta[name=description]').attr('content'),
        link,
        item: items,
    };
}
