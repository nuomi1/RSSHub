import { load } from 'cheerio';

import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '', label: '全部' },
    { value: '02', label: '其他' },
    { value: '01', label: '採購公告' },
    { value: '06', label: '新聞稿' },
    { value: '05', label: '肅貪' },
    { value: '04', label: '預防' },
    { value: '03', label: '綜合' },
    { value: '99', label: '防疫專區' },
];

const baseUrl = 'https://www.aac.moj.gov.tw';

function parseListDate(value: string) {
    const match = value.match(/(\d{3,4})-(\d{1,2})-(\d{1,2})/);
    if (!match) {
        return;
    }
    const year = Number(match[1]) + (match[1].length === 3 ? 1911 : 0);
    return timezone(parseDate(`${year}-${match[2]}-${match[3]}`, 'YYYY-M-D'), 8);
}

export const route: Route = {
    path: '/aac/news/:type?',
    categories: ['government'],
    example: '/gov/moj/aac/news',
    parameters: { type: { description: '資料大類，留空為全部', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '最新消息',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '資料大類',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type');
    const url = `${baseUrl}/7204/7246/?Page=1&PageSize=40${type ? `&type=${type}` : ''}`;
    const response = await got(url);
    const $ = load(response.data);
    $('.num').remove();
    const list = $('.lp .table_list tbody tr, .list ul li')
        .toArray()
        .map((item): DataItem & { isDownload?: boolean; link: string } => {
            const $row = $(item);
            const $item = $row.find('a').first();
            const isDownload = /檔案下載/.test($item.attr('title') ?? '');
            const title = isDownload ? $item.text() : $item.attr('title') || $item.text();
            return {
                title: title!,
                link: new URL($item.attr('href')!, url).href,
                pubDate: parseListDate($row.find('.date').text()),
                isDownload,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                if (!item.isDownload) {
                    const response = await got(item.link);
                    const $ = load(response.data);

                    const publishedTime = $('.info time').attr('datetime');
                    if (publishedTime) {
                        item.pubDate = timezone(parseDate(publishedTime, 'YYYY-MM-DD HH:mm:ss'), 8);
                    }
                    $('.info, button').remove();
                    item.description = $('.cp').html()! + ($('.lightbox_slider').length ? $('.lightbox_slider').html() : '')! + ($('.file_download').length ? $('.file_download').html() : '');
                }
                delete item.isDownload;
                return item;
            })
        )
    );

    return {
        title: $('head title').text(),
        link: url,
        item: items,
        language: 'zh-TW' as const satisfies Language,
    };
}
