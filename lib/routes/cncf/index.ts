import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATE_OPTIONS = [
    { value: 'blog', label: 'Blog' },
    { value: 'news', label: 'News' },
    { value: 'announcements', label: 'Announcements' },
    { value: 'reports', label: 'Reports' },
];
const CATE_OPTIONS_DEFAULT = 'blog';

const rootURL = 'https://www.cncf.io';

export const route: Route = {
    path: '/:cate?',
    categories: ['programming'],
    example: '/cncf',
    parameters: { cate: { description: 'blog by default', options: CATE_OPTIONS, default: CATE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Category',
    maintainers: ['Fatpandac'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'cate',
        description: '说明',
        options: CATE_OPTIONS,
    }),
};

async function handler(ctx) {
    const cate = ctx.req.param('cate') ?? CATE_OPTIONS_DEFAULT;
    const url = `${rootURL}/${cate}/`;

    const response = await got(url);
    const $ = load(response.data);
    const title = $('h1.is-style-page-title').text();
    const list = $('div.post-archive__item')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('span.post-archive__title').text(),
                link: $item.find('span.post-archive__title > a').attr('href'),
                pubDate: timezone(parseDate($item.find('span.post-archive__item_date').text().split('|', 1)[0]), 0),
                description: $item.find('div.post-archive__excerpt').html() ?? undefined,
            };
        });

    const items = await pMap(
        list,
        (item) => {
            if (!['cncf.io', 'www.cncf.io'].includes(new URL(item.link!).hostname)) {
                return item;
            }
            return cache.tryGet(item.link!, async () => {
                const detailResponse = await got(item.link);
                const content = load(detailResponse.data);

                const publicationDate = content('meta[property="article:published_time"]').attr('content');
                if (publicationDate) {
                    item.pubDate = parseDate(publicationDate);
                }

                item.author =
                    content('.post-author__author')
                        .text()
                        .replace(/^by\s+/, '') || undefined;
                content('div.post-author').remove();
                content('div.social-share').remove();

                item.description = content('article').html();

                return item;
            });
        },
        { concurrency: 3 }
    );

    return {
        title: `CNCF - ${title}`,
        link: url,
        item: items,
    };
}
