import { load } from 'cheerio';

import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'tzgg_191', label: '通知公告' },
    { value: 'gqdj', label: '国企资讯' },
    { value: 'gqjj', label: '国企简介' },
    { value: 'gqzp', label: '国企招聘' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg_191';

export const route: Route = {
    path: '/gzw/:category{.+}?',
    categories: ['government'],
    example: '/gov/chongqing/gzw',
    parameters: {
        category: { description: '分类，见下表，默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT },
    },
    name: '国有资产监督管理委员会',
    url: 'gzw.cq.gov.cn',
    maintainers: ['nczitzk'],
    handler,
    radar: [
        {
            source: ['gzw.cq.gov.cn/tzgg_191/', 'gzw.cq.gov.cn/tzgg_191/*'],
            target: '/gzw/tzgg_191',
        },
        {
            source: ['gzw.cq.gov.cn/gqdj/', 'gzw.cq.gov.cn/gqdj/*'],
            target: '/gzw/gqdj',
        },
        {
            source: ['gzw.cq.gov.cn/gqjj/', 'gzw.cq.gov.cn/gqjj/*'],
            target: '/gzw/gqjj',
        },
        {
            source: ['gzw.cq.gov.cn/gqzp/', 'gzw.cq.gov.cn/gqzp/*'],
            target: '/gzw/gqzp',
        },
    ],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 15);
    // Detail timestamps can refine the calendar dates on the list page.
    const candidateLimit = ctx.req.query('sorted') === 'false' ? limit : Math.max(15, limit);

    const rootUrl = 'https://gzw.cq.gov.cn';
    const currentUrl = `${rootUrl}/${category}`;

    const { data: response } = await got(currentUrl);

    const $ = load(response);

    let items = $('ul.tab-item li.clearfix')
        .slice(0, candidateLimit)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            const a = $item.find('a');
            const pubDate = $item.find('span').text();

            return {
                title: a.text(),
                link: new URL(
                    a.prop('href')!.replace(/^\./, () => category),
                    rootUrl
                ).href,
                pubDate: pubDate ? timezone(parseDate(pubDate), 8) : undefined,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const { data: detailResponse } = await got(item.link);

                const content = load(detailResponse);

                item.title = content('meta[name="ArticleTitle"]').prop('content') || item.title;
                item.description = content('div.trs_paper_default').html();
                item.author = content('meta[name="ContentSource"]').prop('content');
                item.category = (content('meta[name="Keywords"]').prop('content') ?? '').split(/;/).filter(Boolean);
                const pubDate = content('meta[name="PubDate"]').prop('content');
                if (pubDate) {
                    item.pubDate = timezone(parseDate(pubDate), 8);
                }

                return item;
            })
        )
    );

    const icon = new URL('favicon.ico', rootUrl).href;

    const language = $('html').prop('lang') as Language;

    return {
        item: items,
        title: `${$('title').text()} - ${$('meta[name="ColumnName"]').prop('content')}`,
        link: currentUrl,
        description: $('meta[name="ColumnDescription"]').prop('content'),
        language,
        image: new URL($('div.logo img').prop('src')!, rootUrl).href,
        icon,
        logo: icon,
        subtitle: $('meta[name="ColumnKeywords"]').prop('content'),
        author: $('meta[name="SiteName"]').prop('content'),
    };
}
