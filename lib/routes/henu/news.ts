import { load } from 'cheerio';
import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDateInTimezone } from '@/utils/parse-date-in-timezone';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'jxdt', label: '教学动态' },
    { value: 'mtbd', label: '媒体报道' },
];
const TYPE_OPTIONS_DEFAULT = 'tzgg';

const baseUrl = 'https://jwc.henu.edu.cn';

const map = {
    tzgg: '/tzgg.htm',
    jxdt: '/jxdt.htm',
    mtbd: '/jxdt/mtbd.htm',
};

export const route: Route = {
    path: '/:type?',
    categories: ['university'],
    example: '/henu/tzgg',
    parameters: { type: { description: '分类，见下表，默认为通知公告', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '教务处',
    maintainers: ['CasterWx'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError(`Invalid notice type: ${type}. Supported types: ${Object.keys(map).join(', ')}.`);
    }
    const link = `${baseUrl}${map[type]}`;

    const response = await ofetch(link, {
        headers: {
            Referer: link,
        },
    });
    const $ = load(response);

    return {
        link,
        title: $('title').text(),
        item: $('.article-list li')
            .toArray()
            .map((elem): DataItem => {
                const date = $('.article-date', elem).text();
                return {
                    link: new URL($('a', elem).attr('href')!, link).href,
                    title: $('.article-title', elem).text(),
                    pubDate: date ? parseDateInTimezone(date, 8) : undefined,
                };
            }),
    };
}
