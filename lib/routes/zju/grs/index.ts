import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '1', label: '全部公告' },
    { value: '2', label: '教学管理' },
    { value: '3', label: '各类资助' },
    { value: '4', label: '学科建设' },
    { value: '5', label: '海外交流' },
];

const host = 'http://www.grs.zju.edu.cn/';

const map = new Map([
    [1, { title: '浙大研究生院 -- 全部公告', tag: 'qbgg' }],
    [2, { title: '浙大研究生院 -- 教学管理', tag: 'jxgl' }],
    [3, { title: '浙大研究生院 -- 各类资助', tag: 'glzz' }],
    [4, { title: '浙大研究生院 -- 学科建设', tag: 'xkjs' }],
    [5, { title: '浙大研究生院 -- 海外交流', tag: 'hwjl' }],
]);

export const route: Route = {
    path: '/grs/:type',
    categories: ['university'],
    example: '/zju/grs/1',
    parameters: { type: { description: '分类，见下表', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '研究生院',
    maintainers: ['Caicailiushui'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = Number.parseInt(ctx.req.param('type'));
    const tag = map.get(type)!.tag;
    const url = `${host}${tag}/list.htm`;
    const res = await got(url);

    const $ = load(res.data);
    const list = $('#wp_news_w09').find('.list-item');

    const items = list.toArray().map((item) => {
        const $item = $(item);
        return {
            title: $item.find('h3').attr('title')!,
            pubDate: timezone(parseDate($item.find('.date').text().trim(), 'YY-MM-DD'), 8),
            link: `http://www.grs.zju.edu.cn${$item.find('a').eq(-1).attr('href')}`,
            description: $item.find('p').text(),
        };
    });

    return {
        title: map.get(type)!.title,
        link: `${host}${tag}/list.htm`,
        item: items,
    };
}
