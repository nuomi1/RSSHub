import { load } from 'cheerio';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '0', label: '学院要闻' },
    { value: '1', label: '学院公告' },
    { value: '2', label: '学院活动' },
];
const TYPE_OPTIONS_DEFAULT = '0';

export const route: Route = {
    path: '/it/:type?',
    categories: ['university'],
    example: '/ouc/it/0',
    parameters: { type: { description: '默认为 `0`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['it.ouc.edu.cn/'],
            target: '/it',
        },
    ],
    name: '信息科学与工程学院',
    maintainers: ['GeoffreyChen777', '3401797899'],
    handler,
    url: 'it.ouc.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const host = 'https://it.ouc.edu.cn';
    const typelist = ['学院要闻', '学院公告', '学术活动'];
    const urlList = ['xyyw/list.htm', 'xygg/list.htm', 'xshd/list.htm'];
    const type = Number(ctx.req.param('type') ?? 0);
    if (!Number.isSafeInteger(type) || type < 0 || type >= urlList.length) {
        throw new InvalidParameterError('The notice type must be 0, 1, or 2');
    }
    const link = new URL(urlList[type], host).href;
    const response = await got(link);
    const $ = load(response.data);

    const list = $('.col_news_list .news_list li')
        .toArray()
        .map((e): DataItem & { link: string } => {
            const $e = $(e);
            const a = $e.find('a');
            return {
                title: a.attr('title')!,
                link: new URL(a.attr('href')!, host).href,
                pubDate: timezone(parseDate($e.find('span.news_meta').text(), 'YYYY-MM-DD'), 8),
            };
        });

    const out = await pMap(
        list,
        async (item) => {
            const description = await cache.tryGet(`ouc:article:body:${item.link}`, async () => {
                const response = await got(item.link);
                const $ = load(response.data);
                return $('.wp_articlecontent').html();
            });
            return { ...item, author: '中国海洋大学信息科学与工程学院', description };
        },
        { concurrency: 3 }
    );

    return {
        title: `中国海洋大学信息科学与工程学院${typelist[type]}`,
        link,
        item: out,
    };
}
