import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { getCookie, rootUrl } from './utils';

const CATEGORY_OPTIONS = [
    { value: '', label: '资讯首页' },
    { value: 'dongtai', label: '业界动态' },
    { value: 'yugao', label: '视频预告' },
    { value: 'xinzuo', label: '新作发布' },
    { value: 'zixun', label: '游戏资讯' },
    { value: 'pingce', label: '游戏评测' },
    { value: 'wangluo', label: '网络游戏' },
    { value: 'shouyou', label: '手机游戏' },
];

export const route: Route = {
    path: '/news/:category?',
    categories: ['game'],
    example: '/yxdown/news',
    parameters: { category: { description: '分类，见下表，默认为资讯首页', options: CATEGORY_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '资讯',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ? `${ctx.req.param('category')}/` : '';

    const currentUrl = `${rootUrl}/news/${category}`;

    const cookie = await getCookie();

    const response = await got(currentUrl, {
        headers: {
            cookie,
        },
    });
    const $ = load(response.data);

    const list = $('.div_zixun h2 a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')}`,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got(item.link, {
                    headers: {
                        cookie,
                    },
                });
                const content = load(detailResponse.data);

                content('h1, .intro').remove();

                item.description = content('.news').html();
                item.pubDate = timezone(parseDate(content('meta[property="og:release_date"]').attr('content')!), 8);

                return item;
            })
        )
    );

    return {
        title: `${$('.now').text()} - 游讯网`,
        link: currentUrl,
        item: items,
    };
}
