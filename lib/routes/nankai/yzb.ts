import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '5509', label: '硕士招生' },
    { value: '2552', label: '博士招生' },
    { value: '2562', label: '港澳台研究生最新信息' },
];
const TYPE_OPTIONS_DEFAULT = '5509';

export const route: Route = {
    path: '/yzb/:type?',
    categories: ['university'],
    example: '/nankai/yzb/5509',
    parameters: { type: { description: '栏目名（若为空则默认为“硕士招生”）', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['yzb.nankai.edu.cn', 'yzb.nankai.edu.cn/:type/list.htm'],
            target: '/yzb/:type?',
        },
    ],
    name: '研究生招生网',
    maintainers: ['sddzhyc'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '栏目名',
        options: TYPE_OPTIONS,
    }),
    url: 'yzb.nankai.edu.cn',
    handler: async (ctx) => {
        // Read the notice category from the route path.
        const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
        const baseUrl = 'https://yzb.nankai.edu.cn';
        const { data: response } = await got(`${baseUrl}/${type}/list.htm`);
        const $ = load(response);

        // Map the notice elements into feed items.
        const dateList = $('#wp_news_w9')
            .find('span.col_news_date')
            .toArray()
            .map((item) => $(item).text().trim());

        const list = $('#wp_news_w9')
            .find('a[title]')
            .toArray()
            .map((element, index): DataItem => {
                const $a = $(element);
                const href = $a.attr('href');
                const link = href ? new URL(href, `${baseUrl}/${type}/list.htm`).href : undefined;

                const publishedDate = dateList[index];
                return {
                    title: $a.text(),
                    link,
                    pubDate: publishedDate ? timezone(parseDate(publishedDate), 8) : undefined,
                };
            })
            .filter((item) => item.link);

        const items = await pMap(
            list,
            async (item) => {
                const detail = await cache.tryGet(`nankai:yzb:article:v2:${item.link}`, async () => {
                    const { data: response } = await got(item.link);
                    const $ = load(response);
                    let description = $('.read').html();

                    // Extract the PDF links from each player.
                    const pdfLinks = $('div[pdfsrc$=".pdf"]')
                        .toArray()
                        .map((el) => {
                            const pdfUrl = $(el).attr('pdfsrc') || '';
                            const sudyfileAttr = ($(el).attr('sudyfile-attr') || '{}').replaceAll("'", '"');
                            const sudyfileAttrJson = JSON.parse(sudyfileAttr);
                            const fileName = sudyfileAttrJson.title || '未命名文件.pdf';
                            return `<a href="${new URL(pdfUrl, baseUrl).href}">${fileName}</a>`;
                        })
                        .join('<br>');

                    if (pdfLinks) {
                        description = `${description ?? ''}<h4>相关附件：</h4>${pdfLinks}`;
                    }

                    return { description };
                });
                return { ...item, ...detail };
            },
            { concurrency: 3 }
        );

        return {
            title: `南开大学研究生招生网-${$('.column-title').text()}`,
            link: `${baseUrl}/${type}/list.htm`,
            item: items,
        };
    },
};
