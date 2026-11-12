/*
 * @Author: Kingsr
 * @Date: 2020-03-04 15:59:49
 * @LastEditors: Kingsr
 * @LastEditTime: 2020-03-04 17:39:01
 * @Description: 桂林航天工业学院RSSHub规则
 */
import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'ghyw', label: '桂航要闻' },
    { value: 'zxdt', label: '最新动态' },
    { value: 'tzgg', label: '通知公告' },
    { value: 'xxgk', label: '信息公开' },
];
const TYPE_OPTIONS_DEFAULT = 'ghyw';

export const route: Route = {
    path: '/news/:type?',
    categories: ['university'],
    example: '/guat/news/ghyw',
    parameters: { type: { description: '资讯类型，如下表', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '新闻资讯',
    maintainers: ['wyml'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '资讯类型',
        options: TYPE_OPTIONS,
    }),
    handler,
};

const host = 'https://www.guat.edu.cn';

const urls = {
    ghyw: `${host}/index/ghyw.htm`,
    zxdt: `${host}/index/zxdt.htm`,
    tzgg: `${host}/tzgg/tzgg.htm`,
    xxgk: `${host}/tzgg/xxgk.htm`,
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(urls, type)) {
        throw new InvalidParameterError('Invalid news type. Use ghyw, zxdt, tzgg, or xxgk.');
    }
    const url = urls[type];
    const response = await ofetch(url);
    const $ = load(response);

    const list = $('.list_pic li a, div.list ul li a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const sj = $item.find('.sj');
            return {
                title: $item.attr('title')!,
                link: new URL($item.attr('href')!, url).href,
                description: $item.find('.zy').text(),
                pubDate: timezone(parseDate(sj.length ? `${sj.find('span').text()}-${sj.find('p').text()}` : $item.find('span').text()), 8),
            };
        });

    const items = await pMap(
        list,
        async (item) => {
            if (!item.link?.startsWith(`${host}/`)) {
                return item;
            }
            const description = await cache.tryGet(`guat:article:${item.link}`, async () => {
                const article = await ofetch<string>(item.link!);
                const $ = load(article);
                return $('.v_news_content').html() ?? undefined;
            });
            return { ...item, summary: item.description ?? undefined, description };
        },
        { concurrency: 3 }
    );

    return {
        title: `桂林航天工业学院 - ${$('.ej_main h2').text().trim()}`,
        link: url,
        item: items,
    };
}
