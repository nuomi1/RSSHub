import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { cookieJar, processArticle } from './utils';

const CATID_OPTIONS = [
    { value: 'all', label: '全部文章' },
    { value: 'experience', label: '情趣體驗報告' },
    { value: 'news', label: '情趣新聞' },
    { value: 'graduate', label: '情趣研究所' },
];
const CATID_OPTIONS_DEFAULT = 'all';

const baseUrl = 'http://stno1.playno1.com';

export const route: Route = {
    path: '/st/:catid?',
    categories: ['bbs'],
    example: '/playno1/st',
    parameters: { catid: { description: '分类，见下表，默认为全部文章', options: CATID_OPTIONS, default: CATID_OPTIONS_DEFAULT } },
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
            source: ['stno1.playno1.com/stno1/:catid/'],
            target: '/st/:catid',
        },
    ],
    name: '情趣',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'catid',
        description: '分类',
        options: CATID_OPTIONS,
    }),
};

async function handler(ctx) {
    const { catid = CATID_OPTIONS_DEFAULT } = ctx.req.param();
    const url = `${baseUrl}/stno1/${catid}/`;
    const response = await got(url, {
        cookieJar,
    });
    const $ = load(response.data);

    let items = $('.fallsBox')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.find('.ftitle a').attr('title')!,
                link: $item.find('.ftitle a').attr('href'),
                pubDate: timezone(parseDate($item.find('.dateBox').text(), 'YYYY-MM-DD HH:mm'), 8),
                author: $item.find('.dateBox span a').eq(0).text().trim(),
            };
        });

    items = await processArticle(items, cache);

    return {
        title: $('head title').text(),
        link: url,
        item: items,
        language: 'zh-TW' as const,
    };
}
