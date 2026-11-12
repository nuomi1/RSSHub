import { load } from 'cheerio';
import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'sszs', label: '硕士招生' },
    { value: 'bszs', label: '博士招生' },
];
const TYPE_OPTIONS_DEFAULT = 'sszs';

const map = {
    sszs: 'sszs/',
    bszs: 'bszs/',
};

export const route: Route = {
    path: '/graduate/:type?',
    categories: ['university'],
    example: '/hnust/graduate/sszs',
    parameters: { type: { description: '默认为 `sszs`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '研究生院招生工作',
    maintainers: ['Pretty9'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError('Invalid type: expected sszs or bszs.');
    }
    const base = 'https://graduate.hnust.edu.cn/zsgz/' + (Object.hasOwn(map, type) ? map[type] : map.sszs);
    const link = `${base}index.htm`;
    const response = await ofetch(link);
    const $ = load(response);

    const items = $('.list .item ul li')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const date = $item.find('span').text();
            const title = $item.find('a').text();

            return {
                title,
                pubDate: timezone(parseDate(date), 8),
                link: new URL($item.find('a').attr('href')!, link).href,
            };
        });

    return {
        title: '湖南科技大学研究生院招生工作通知',
        link,
        description: '湖南科技大学研究生院招生工作通知',
        image: 'https://i.loli.net/2020/03/24/EAoPzbTsBxeOdjH.jpg',
        item: items,
    };
}
