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
    { value: '1', label: '学工动态' },
    { value: '2', label: '通知公告' },
    { value: '4', label: '网上公示' },
];
const TYPE_OPTIONS_DEFAULT = '2';

export const route: Route = {
    path: '/xsc/:type?',
    categories: ['university'],
    example: '/dgut/xsc',
    parameters: { type: { description: '默认为 `2`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '学工部动态',
    maintainers: ['korokor0'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
    handler,
};

const host = 'https://xsc.dgut.edu.cn/';
const name = '学生工作部（学生处）';
const map = {
    1: { info: '学工动态', urlType: 'bgfw/xgdt' },
    2: { info: '通知公告', urlType: 'bgfw/tzgg' },
    4: { info: '网上公示', urlType: 'bgfw/wsgs' },
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError('Invalid notification type. Use 1, 2, or 4.');
    }
    const { info, urlType } = map[type];

    const response = await ofetch(`${host}${urlType}/`);

    const $ = load(response);

    const limit = getRouteLimit(ctx, 10);
    const list = $('#paging > ul li')
        .slice(0, Math.max(10, limit))
        .toArray()
        .map((element) => {
            const $item = $(element);
            const title = $item.find('a').attr('title');
            if (!title) {
                return;
            }
            return {
                title,
                pubDate: timezone(parseDate($item.find('.time').text()), 8),
                link: new URL($item.find('a').attr('href')!, host).href,
            };
        })
        .filter((item) => item !== undefined);
    const ordered = ctx.req.query('sorted') === 'false' ? list : list.toSorted((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
    const items = await pMap(
        ordered.slice(0, limit),
        (item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                return { ...item, description: $('.newsContent').first().html() ?? undefined };
            }),
        { concurrency: 3 }
    );

    return {
        title: `东莞理工学院 ${name} ${info}`,
        link: `${host}${urlType}/index.shtml`,
        description: `东莞理工学院 ${name} ${info}`,
        item: items,
    };
}
