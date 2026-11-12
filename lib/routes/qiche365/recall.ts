import { load } from 'cheerio';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CHANNEL_OPTIONS = [
    { value: '1', label: '国内召回新闻' },
    { value: '2', label: '国内召回公告' },
    { value: '3', label: '国外召回新闻' },
    { value: '4', label: '国外召回公告' },
];

const baseUrl = 'https://www.qiche365.org.cn';

export const route: Route = {
    path: '/recall/:channel',
    name: '汽车召回',
    example: '/qiche365/recall/1',
    parameters: { channel: { description: '频道，见下表', options: CHANNEL_OPTIONS } },
    description: renderOptionsMarkdownTable({
        parameter: 'channel',
        description: '频道',
        options: CHANNEL_OPTIONS,
    }),
    categories: ['government'],
    features: {
        antiCrawler: true,
    },
    maintainers: ['huanfe1', 'pseudoyu'],
    handler,
    url: 'qiche365.org.cn/index/recall/index.html',
};

async function handler(ctx): Promise<Data> {
    const { channel } = ctx.req.param();
    const targetUrl = `${baseUrl}/index/recall/index/item/${channel}.html?loadmore=1`;

    // Reason: site uses cookie-based anti-bot — first request returns 403 with set-cookie,
    // second request with those cookies returns the actual JSON data.
    const initResponse = await ofetch.raw(targetUrl, {
        headers: {
            'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        ignoreResponseError: true,
    });

    const cookies = (initResponse.headers.getSetCookie?.() || []).map((c) => c.split(';', 1)[0]).join('; ');

    const { html } = await ofetch<{ html: string }>(targetUrl, {
        headers: {
            'Accept-Language': 'zh-CN,zh;q=0.9',
            Cookie: cookies,
        },
    });

    const $ = load(html);
    const items: DataItem[] = $('li')
        .toArray()
        .map((item) => {
            const cheerioItem = $(item);
            return {
                title: cheerioItem.find('h1').text(),
                link: `${baseUrl}${cheerioItem.find('a').attr('href')}`,
                pubDate: timezone(parseDate(cheerioItem.find('h2').html()!.match('</i>(.*?)<b>')![1]), 8),
                description: cheerioItem.find('p').text().trim(),
                author: cheerioItem.find('h3 span').text(),
                image: cheerioItem.find('img').attr('src') && `${baseUrl}${cheerioItem.find('img').attr('src')}`,
            };
        });
    return {
        title: ['国内召回新闻', '国内召回公告', '国外召回新闻', '国外召回公告'][Number(channel) - 1],
        link: `${baseUrl}/index/recall/index.html`,
        item: items,
        language: 'zh-CN',
    };
}
