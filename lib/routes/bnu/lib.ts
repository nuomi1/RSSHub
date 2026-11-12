import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'zydt', label: '资源动态' },
    { value: 'xwdt', label: '新闻动态' },
    { value: 'xljz1', label: '系列讲座' },
];
const CATEGORY_OPTIONS_DEFAULT = 'zydt';

export const route: Route = {
    path: '/lib/:category?',
    categories: ['university'],
    example: '/bnu/lib/zydt',
    parameters: { category: { description: '分类，见下表，默认为 `zydt`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['www.lib.bnu.edu.cn/:category/index.htm'],
            target: '/lib/:category',
        },
    ],
    name: '图书馆通知',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const baseUrl = 'http://www.lib.bnu.edu.cn';
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `${baseUrl}/${category}/index.htm`;

    const { data: response } = await got(link);
    const $ = load(response);

    const list = $('.view-content .item-list li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('a').text(),
                link: `${baseUrl}/${category}/${$item.find('a').attr('href')}`,
                pubDate: parseDate($item.find('span > span').eq(1).text(), 'YYYY-MM-DD'),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);
                item.description = $('#block-system-main .content .content').html();
                return item;
            })
        )
    );

    return {
        title: $('head title').text(),
        link,
        item: items,
    };
}
