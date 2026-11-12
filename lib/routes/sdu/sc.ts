import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDateInTimezone } from '@/utils/parse-date-in-timezone';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: '0', label: '通知公告' },
    { value: '1', label: '学术动态' },
    { value: '2', label: '本科教育' },
    { value: '3', label: '研究生教育' },
];
const TYPE_OPTIONS_DEFAULT = '0';

const host = 'https://www.sc.sdu.edu.cn/';
const typelist = ['通知公告', '学术动态', '本科教育', '研究生教育'];
const urlList = ['tzgg.htm', 'kxyj/xsyg.htm', 'rcpy/bkjy.htm', 'rcpy/yjsjy.htm'];

export const route: Route = {
    path: '/sc/:type?',
    categories: ['university'],
    example: '/sdu/sc/0',
    parameters: { type: { description: '默认为 `0`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '软件学院通知',
    maintainers: ['Ji4n1ng'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ? Number.parseInt(ctx.req.param('type')) : 0;
    const link = new URL(urlList[type], host).href;
    const response = await got(link);

    const $ = load(response.data);

    let item = $('.newlist01 li')
        .toArray()
        .map((e): DataItem => {
            const $e = $(e);
            const a = $e.find('a');
            let link = a.attr('href');
            link = new URL(link!, host).href;
            return {
                title: a.text().trim(),
                link,
                pubDate: parseDateInTimezone($e.find('.date').text().trim(), 8),
            };
        });

    item = await pMap(
        item,
        async (item) => ({
            ...item,
            ...(await cache.tryGet(`sc:article-v2:${item.link}`, async () => {
                try {
                    const response = await got(item.link);
                    const $ = load(response.data);

                    item.title = $('h3').text();
                    item.author =
                        $('.pr')
                            .text()
                            .trim()
                            .match(/作者：(.*)/)![1] || '山东大学软件学院';
                    $('h3, .pr').remove();
                    item.description = $('.content').html();

                    return { title: item.title, author: item.author, description: item.description };
                } catch {
                    // intranet oa.sdu.edu.cn
                    return {};
                }
            })),
        }),
        { concurrency: 3 }
    );

    return {
        title: `山东大学软件学院${typelist[type]}`,
        description: $('title').text(),
        link,
        item,
    };
}
