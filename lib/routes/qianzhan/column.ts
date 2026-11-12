import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: '220', label: '研究员专栏' },
    { value: '627', label: '规划师专栏' },
    { value: '329', label: '观察家专栏' },
];
const TYPE_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/analyst/column/:type?',
    categories: ['finance'],
    example: '/qianzhan/analyst/column/all',
    parameters: { type: { description: '分类，见下表', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '文章列表',
    maintainers: ['moke8'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    let rootUrl = 'https://www.qianzhan.com/analyst/';
    const titles = {
        all: '最新文章',
        220: '研究员专栏',
        627: '规划师专栏',
        329: '观察家专栏',
    };
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();

    if (type !== 'all') {
        rootUrl = rootUrl + 'list/' + type + '.html';
    }

    const response = await got(rootUrl, { allowH2: false });
    const $ = load(response.data);
    const links = $('.ptb30.bb1e.clf .f22 a')
        .toArray()
        .flatMap((item) => {
            const href = $(item).attr('href');
            return href === undefined ? [] : href;
        });

    const items = await pMap(
        links,
        (item) =>
            cache.tryGet(item, async () => {
                const detailResponse = await got(item, { allowH2: false });
                const $ = load(detailResponse.data);
                const description = $('#divArtBody').html();
                const title = $('#h_title').text();
                const pubDate = timezone(parseDate($('#pubtime_baidu').text().split('• ', 2)[1], 'YYYY-MM-DD HH:mm:ss'), 8);
                const author = $('.bljjxue').text().match(/\S+/)![0];
                return {
                    title,
                    link: item,
                    description,
                    pubDate,
                    author,
                    category: $('meta[name="Keywords"]').attr('content')!.split(','),
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: `前瞻经济学人 - ${titles[type]}`,
        link: rootUrl,
        item: items,
    };
}
