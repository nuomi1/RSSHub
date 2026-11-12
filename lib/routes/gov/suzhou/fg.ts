import { load } from 'cheerio';

import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'szfgw/ggl/nav_list', label: '通知公告' },
    { value: 'szfgw/gzdt/nav_list', label: '发改要闻' },
];
const CATEGORY_OPTIONS_DEFAULT = 'szfgw/ggl/nav_list';

export const route: Route = {
    path: '/fg/:category{.+}?',
    name: '发展和改革委员会',
    example: '/gov/suzhou/fg/szfgw/ggl/nav_list',
    parameters: { category: { description: '分类，见下表，默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['fg.suzhou.gov.cn/szfgw/ggl/nav_list.shtml'],
            target: '/fg/szfgw/ggl/nav_list',
        },
        {
            source: ['fg.suzhou.gov.cn/szfgw/gzdt/nav_list.shtml'],
            target: '/fg/szfgw/gzdt/nav_list',
        },
    ],
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const categoryPath = category.replace(/\.shtml$/, '');
    const limit = getRouteLimit(ctx, 30);

    const rootUrl = 'https://fg.suzhou.gov.cn';
    const currentUrl = `${rootUrl}/${categoryPath}.shtml`;

    const { data: response } = await got(currentUrl);

    const $ = load(response);

    let items = $('h4 a[title], .page-infolist li a[title]')
        .slice(0, ctx.req.query('sorted') === 'false' ? limit : Math.max(30, limit))
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            const date = $item.parent().find('span.time').text().trim();
            const pubDate = date ? timezone(parseDate(date, 'YYYY-MM-DD', true), 8) : undefined;

            return {
                title: $item.prop('title') || $item.text(),
                link: new URL($item.prop('href')!, rootUrl).href,
                author: $item.find('.author').text(),
                pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : undefined,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const { data: detailResponse } = await got(item.link);

                const content = load(detailResponse);

                item.title = content('ucaptitle').text().trim();
                item.description = content('ucapcontent').html();
                item.author = content('span.ly b').text().trim();
                const date = content('meta[name="PubDate"]').prop('content');
                const pubDate = date ? timezone(parseDate(date, ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm'], true), 8) : undefined;
                item.pubDate = pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : item.pubDate;

                return item;
            })
        )
    );

    if (ctx.req.query('sorted') !== 'false' && items.every((item) => item.pubDate instanceof Date && Number.isFinite(item.pubDate.getTime()))) {
        items.sort((a, b) => (b.pubDate as Date).getTime() - (a.pubDate as Date).getTime());
        items = items.slice(0, limit);
    }

    const author = $('meta[name="SiteName"]').prop('content');
    const subtitle = $('meta[name="ColumnName"]').prop('content');
    const imageUrl = $('div.logo img, .header-logo img').first().prop('src');
    const image = imageUrl ? new URL(imageUrl, rootUrl).href : undefined;

    const language = $('html').prop('lang') as Language;

    return {
        item: items,
        title: `${author} - ${subtitle}`,
        link: currentUrl,
        description: $('meta[name="ColumnDescription"]').prop('content'),
        language,
        image,
        subtitle,
        author,
    };
}
