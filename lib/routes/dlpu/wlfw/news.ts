import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '22', label: '新闻动态' },
    { value: '23', label: '通知公告' },
];
const TYPE_OPTIONS_DEFAULT = '22';

export const route: Route = {
    path: '/wlfw/news/:type?',
    categories: ['university'],
    example: '/dlpu/wlfw/news/22',
    parameters: { type: { description: '默认为 `22`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '网络服务新闻',
    maintainers: ['xu42'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

const baseUrl = 'https://wlfw.dlpu.edu.cn';

const map = {
    22: '/more/22',
    23: '/more/23',
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError('Unsupported category. Use 22 for news or 23 for notices.');
    }
    const link = `${baseUrl}${map[type]}`;

    const response = await ofetch(link);

    const $ = load(response);
    let list = $('.morelist>li')
        .slice(0, Math.max(10, getRouteLimit(ctx, 10)))
        .toArray()
        .map((elem) => ({
            link: new URL($('a', elem).attr('href')!, baseUrl).href,
            title: $('a', elem).attr('title')!,
            pubDate: timezone(parseDate($('.more_time', elem).text()), 8),
        }));
    if (ctx.req.query('sorted') !== 'false') {
        list.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    }
    list = list.slice(0, getRouteLimit(ctx, 10));
    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch<string>(item.link);
                const page = load(response);
                const content = page('#content');
                if (!content.length) {
                    throw new Error('The official article page did not provide its main content.');
                }
                page('#aeinfo br').replaceWith('\n');
                const author = page('#aeinfo').text().trim() || undefined;
                content.find('#aeinfo, #hits').remove();
                return { ...item, description: content.html(), author };
            }),
        { concurrency: 3 }
    );

    return {
        link,
        title: $('#main>h1').text(),
        language: 'zh-CN' as const,
        item: items,
    };
}
