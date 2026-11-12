import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getPageItemAndDate } from './utils/index';

const TYPES_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'xkjs', label: '学科竞赛公告' },
    { value: 'cxtz', label: '创新项目公告' },
    { value: 'jsxw', label: '竞赛新闻' },
    { value: 'jstz', label: '竞赛通知' },
];
const TYPES_OPTIONS_DEFAULT = 'xkjs';

export const route: Route = {
    path: '/cxzx/:types?',
    categories: ['university'],
    example: '/jsu/cxzx/xkjs',
    parameters: { types: { description: '通知分类 默认为`xkjs`', options: TYPES_OPTIONS, default: TYPES_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '创新中心',
    maintainers: ['wenjia03'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'types',
        description: '通知分类',
        options: TYPES_OPTIONS,
    }),
};

async function handler(ctx) {
    const { types = TYPES_OPTIONS_DEFAULT } = ctx.req.param();
    const baseUrl = 'https://cxzx.jsu.edu.cn/';
    const urls = {
        tzgg: {
            url: 'https://cxzx.jsu.edu.cn/xwzx.htm',
            title: '通知公告',
        },
        xkjs: {
            url: 'https://cxzx.jsu.edu.cn/xwzx/zxdt.htm',
            title: '学科竞赛公告',
        },
        cxtz: {
            url: 'https://cxzx.jsu.edu.cn/cxlt/xsjz1.htm',
            title: '创新项目公告',
        },
        jsxw: {
            url: 'https://cxzx.jsu.edu.cn/cxjs.htm',
            title: '竞赛新闻',
        },
        jstz: {
            url: 'https://cxzx.jsu.edu.cn/cxjs/xkjs.htm',
            title: '竞赛新闻 -> 通知公告',
        },
    };

    const response = await got({
        method: 'get',
        url: urls[types].url,
    });

    const $ = load(response.data);
    const list = $('tr[height="20"]').toArray();

    const out = await pMap(
        list,
        async (item) => {
            const $item = $(item);
            const link = new URL($item.find('td:nth-child(2) > a').attr('href')!, baseUrl).href;
            const title = $item.find('td:nth-child(2) > a').text() || '无标题';
            const category = urls[types].title;
            const description = await cache.tryGet(`jsu:cxzx:${link}`, () =>
                getPageItemAndDate(
                    '#vsb_newscontent',
                    link,
                    'body > div.cx_big_container > div.cx_content_container > div.cx_right_part > div.viewbox > form > table > tbody > tr:nth-child(1) > td',
                    'body > div.cx_big_container > div.cx_content_container > div.cx_right_part > div.viewbox > form > table > tbody > tr:nth-child(2) > td > span.timestyle134612'
                )
            );
            const pubDate = parseDate(description.date);
            return {
                title,
                link,
                pubDate,
                description: description.pageInfo,
                category,
            };
        },
        { concurrency: 3 }
    );

    return {
        title: `吉首大学创新中心 - ${urls[types].title}`,
        link: urls[types].url,
        description: '吉首大学创新中心',
        item: out,
    };
}
