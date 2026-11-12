import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'gzdt', label: '财政动态' },
    { value: 'zhxw', label: '综合新闻' },
    { value: 'tzgg', label: '通知公告' },
];
const CATEGORY_OPTIONS_DEFAULT = 'gzdt';

export const route: Route = {
    path: '/czt/xwdt/:category?',
    categories: ['government'],
    example: '/gov/hebei/czt/xwdt',
    parameters: { category: { description: '分类，见下表，默认为财政动态', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '财政厅',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'http://czt.hebei.gov.cn';
    const currentUrl = `${rootUrl}/xwdt/${category}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('td li a[title]')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);

            return {
                title: $item.text(),
                link: new URL($item.attr('href')!, `${currentUrl}/`).href,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                item.author = content('meta[name="ContentSource"]').attr('content');
                const pubDate = content('meta[name="PubDate"]').attr('content');
                item.pubDate = pubDate ? timezone(parseDate(pubDate), 8) : undefined;
                item.description = content('.TRS_Editor, .content').html();

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
