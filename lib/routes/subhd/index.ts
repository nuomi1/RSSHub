import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import { getSubPath } from '@/utils/common-utils';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'new', label: '最新字幕' },
    { value: 'top', label: '热门字幕' },
    { value: 'tv', label: '剧集字幕' },
    { value: 'movie', label: '电影字幕' },
];

const defaultCategories = {
    sub: 'new',
    zu: '14',
};

export const route: Route = {
    path: '/sub/:category?',
    categories: ['multimedia'],
    example: '/subhd/sub/new',
    parameters: { category: { description: '分类，见下表，默认为最新', options: CATEGORY_OPTIONS } },
    radar: [
        {
            source: ['subhd.tv/sub/:category', 'subhd.tv/'],
            target: '/sub/:category?',
        },
    ],
    name: '字幕',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    maintainers: ['laampui', 'nczitzk'],
    handler,
};

export async function handler(ctx) {
    const type = getSubPath(ctx).split('/', 2)[1];
    const category = ctx.req.param('category') ?? defaultCategories[type];

    const rootUrl = 'https://subhd.tv';
    const currentUrl = `${rootUrl}/${type}/${category}${type === 'zu' ? '/l' : ''}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    $('.align-middle').each((_, el) => {
        $(el).removeClass('link-dark');
    });

    let items = $('.view-text a.link-dark[href^="/a/"]')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            const pubDate = $item.parent().parent().find('time[datetime]').attr('datetime');

            return {
                link: `${rootUrl}${$item.attr('href')}`,
                author: $item.parent().parent().find('.text-dark').last().text(),
                pubDate: pubDate ? parseDate(pubDate) : undefined,
                title: `${$item.parent().parent().find('.align-middle').text()} ${$item.text().replace(/ - SubHD/, '')}`,
            };
        });

    items = await pMap(
        items,
        async (item) => {
            const detail = await cache.tryGet(`subhd:article:v2:${item.link}`, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                const files = content('.subtitle-file-list');
                files.find('a[href="#"]').removeAttr('href');
                const description = (content('.subtitle-description').html() ?? '') + (files.html() ?? '');

                return { description };
            });
            return { ...item, ...detail };
        },
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
