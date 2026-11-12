import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'xyxw', label: '学院新闻' },
    { value: 'tzgg', label: '通知公告' },
    { value: 'xsxx', label: '学术信息' },
    { value: 'xgdt', label: '学工动态' },
    { value: 'kydt', label: '科研动态' },
];
const TYPE_OPTIONS_DEFAULT = 'tzgg';

async function fetch(address) {
    const res = await got(address);
    const $ = load(res.data);
    const pubDate = $('.details-time')
        .text()
        .match(/时间：(\d{4}年\d{2}月\d{2}日 \d{2}:\d{2})/)?.[1];
    const content = $('[name="_newscontent_fromname"]');
    content.children('h1, .details-time').remove();
    content.find('script').remove();
    return {
        description: content.html(),
        link: address,
        guid: address,
        pubDate: pubDate ? timezone(parseDate(pubDate, 'YYYY年MM月DD日 HH:mm'), 8) : undefined,
    };
}

export const route: Route = {
    path: '/cse/:type?',
    categories: ['university'],
    example: '/csu/cse',
    parameters: { type: { description: '类型', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '计算机学院',
    maintainers: ['j1g5awi'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const url = 'https://cse.csu.edu.cn/index/';
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    const link = url + type + '.htm';
    const response = await got.get(link);
    const $ = load(response.data);
    const list = $('.download li').toArray();
    const out = await Promise.all(
        list.map((item) => {
            const $ = load(item);
            const address = new URL($('a').attr('href')!, url).href;
            const title = $('a').text();
            const pubDate = $('span').text();
            return cache.tryGet(address, async () => {
                const fetched = await fetch(address);
                const single: DataItem = {
                    ...fetched,
                    title,
                    pubDate: fetched.pubDate ?? timezone(parseDate(pubDate, 'YYYY-MM-DD'), 8),
                };
                return single;
            });
        })
    );
    return {
        title: $('title').text(),
        link,
        item: out,
    };
}
