import { load } from 'cheerio';
import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'notify', label: '通知公告' },
    { value: 'news', label: '教务快讯' },
];
const TYPE_OPTIONS_DEFAULT = 'notify';

export const route: Route = {
    path: '/jw/:type?',
    categories: ['university'],
    example: '/cqust/jw/notify',
    parameters: { type: { description: '可选，默认为 `notify`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '教务处公告',
    maintainers: ['binarization'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
    handler,
};

const host = 'https://jw.cqust.edu.cn';
const map = {
    notify: '/tzgg.htm',
    news: '/xwdt.htm',
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError('Invalid type. Use notify or news.');
    }
    const link = host + map[type];
    const response = await ofetch(link);
    const $ = load(response);

    return {
        title: '重科教务处',
        link,
        description: $('meta[name="description"]').attr('content') || '重科教务处',
        item: $('.text-list li')
            .slice(0, 10)
            .toArray()
            .map((item) => {
                const $item = $(item);
                return {
                    title: $item.find('a').text(),
                    pubDate: timezone(parseDate($item.find('span').text(), 'YYYY-MM-DD'), 8),
                    link: new URL($item.find('a').attr('href')!, host).href,
                };
            }),
    };
}
