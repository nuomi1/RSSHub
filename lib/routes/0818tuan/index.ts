import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const LIST_ID_OPTIONS = [
    { value: '1', label: '最新线报' },
    { value: '2', label: '实测活动' },
    { value: '3', label: '优惠券' },
];
const LIST_ID_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/:listId?',
    categories: ['shopping'],
    example: '/0818tuan',
    parameters: { listId: { description: '活动分类，见下表，默认为 `1`', options: LIST_ID_OPTIONS, default: LIST_ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '分类',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'listId',
        description: '活动分类',
        options: LIST_ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const baseUrl = 'http://www.0818tuan.com';
    const listId = ctx.req.param('listId') || LIST_ID_OPTIONS_DEFAULT;
    const url = `${baseUrl}/list-${listId}-0.html`;

    const { data: response } = await got(url);
    const $ = load(response);

    const list = $(listId === '3' ? '.col-xs-12 .thumbnail > a' : '.col-md-8 .list-group > a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.attr('title')!,
                link: $item.attr('href')!.startsWith('http') ? $item.attr('href') : `${baseUrl}${$item.attr('href')}`,
            };
        })
        // Pinned promotions link off the site (and rotate), while the detail parser only reads www.0818tuan.com pages
        .filter((i) => new URL(i.link!).host === 'www.0818tuan.com' && !i.link!.includes('www.0818tuan.com/pdd/zudui.php'));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);

                $('.pageLink, .alert, p[style="margin:15px;"]').remove();

                item.description = $('.post-content').html();
                item.pubDate = timezone(parseDate($('.panel-body > .text-center').text().replace('时间:', ''), 'YYYY-MM-DD HH:mm:ss'), 8);

                return item;
            })
        )
    );

    return {
        title: $('head title').text(),
        link: url,
        image: 'http://www.0818tuan.com/favicon.ico',
        item: items,
    };
}
