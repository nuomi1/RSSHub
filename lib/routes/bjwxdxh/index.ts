import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '86', label: '协会活动' },
    { value: '99', label: '公告通知' },
    { value: '102', label: '会议情况' },
    { value: '103', label: '简报' },
    { value: '106', label: '政策法规' },
    { value: '107', label: '学习园地' },
    { value: '108', label: '业余无线电服务中心' },
    { value: '111', label: '经验交流' },
    { value: '112', label: '新技术推介' },
    { value: '114', label: '活动通知' },
    { value: '115', label: '爱好者园地' },
    { value: '116', label: '结果查询' },
    { value: '118', label: '资料下载' },
    { value: '119', label: '会员之家' },
    { value: '120', label: '会员简介' },
    { value: '121', label: '会员风采' },
    { value: '122', label: '活动报道' },
];

export const route: Route = {
    path: '/:type?',
    categories: ['government'],
    example: '/bjwxdxh/114',
    parameters: { type: { description: '类型，见下表，默认为全部', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '最新资讯',
    maintainers: ['Misaka13514'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const baseUrl = 'http://www.bjwxdxh.org.cn';
    const type = ctx.req.param('type');
    const link = type ? `${baseUrl}/news/class/?${type}.html` : `${baseUrl}/news/class/`;

    const response = await got({
        method: 'get',
        url: link,
    });

    const $ = load(response.data);
    const list = $('div#newsquery > ul > li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('div.title > a').text(),
                link: new URL($item.find('div.title > a').attr('href')!, baseUrl).href,
                // pubDate: parseDate(item.find('div.time').text(), 'YYYY-MM-DD'),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const response = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(response.data);
                const info = content('div.info')
                    .text()
                    .match(/作者：(\S*)\s+发布于：(\S*\s+.*?)\s/);
                item.author = info![1];
                item.pubDate = timezone(parseDate(info![2], 'YYYY-MM-DD HH:mm:ss'), 8);
                item.description = content('div#con').html()!.replaceAll('\n', '');
                return item;
            })
        )
    );

    return {
        title: $('title').text(),
        link,
        item: items,
    };
}
