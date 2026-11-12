import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const PATH_OPTIONS = [
    { value: 'xwdt2016/tzgg2016', label: '通知公告' },
    { value: 'xwdt2016/kjdt2016', label: '科技动态' },
    { value: 'kxcb2016/kpdt2016', label: '科普动态' },
];

const baseUrl = 'https://is.cas.cn';
const baseHostname = new URL(baseUrl).hostname;
const migratedPaths = {
    'xwdt2016/tzgg2016': 'xwdt/tzgg',
    'xwdt2016/kjdt2016': 'xwdt/kyjz',
    'kxcb2016/kpdt2016': 'kxcb/kpdt',
};

export const route: Route = {
    path: '/is/:path{.+}',
    categories: ['university'],
    example: '/cas/is/xwdt2016/tzgg2016',
    parameters: { path: { description: '路径，可在 URL 找到', options: PATH_OPTIONS } },
    name: '软件研究所',
    maintainers: ['Misaka13514'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'path',
        description: '路径',
        options: PATH_OPTIONS,
    }),
};

async function handler(ctx) {
    const requestedPath = ctx.req.param('path');
    const path = migratedPaths[requestedPath] ?? requestedPath;
    const currentUrl = `${baseUrl}/${path}/`;
    const response = await got(currentUrl);

    const $ = load(response.data);
    const items = $('.subpage-news-list li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('.subpage-news-title').text(),
                link: new URL($item.find('a').attr('href')!, currentUrl).href,
                pubDate: timezone(parseDate($item.find('.subpage-news-date').text(), 'YYYY-MM-DD'), 8),
            };
        });

    const out = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                if (new URL(item.link!).hostname !== baseHostname) {
                    return item;
                }

                const response = await got(item.link);
                const $ = load(response.data);

                item.description = $('.TRS_Editor, .TRS_UEDITOR').first().html();
                return item;
            })
        )
    );

    return {
        title: $('head title').text(),
        link: currentUrl,
        item: out,
    };
}
