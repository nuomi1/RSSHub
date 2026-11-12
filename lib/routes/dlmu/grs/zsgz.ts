import { load } from 'cheerio';
import type { Context } from 'hono';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'bsyjs', label: '博士研究生' },
    { value: 'ssyjs', label: '硕士研究生' },
    { value: 'tdxlgdssxw', label: '同等学力攻读硕士学位' },
    { value: 'gatdqzs', label: '港澳台地区招生' },
];

export const route: Route = {
    path: '/grs/zsgz/:type',
    categories: ['university'],
    example: '/dlmu/grs/zsgz/ssyjs',
    parameters: { type: { description: '招生类别', options: TYPE_OPTIONS } },
    name: '研究生院 - 招生工作',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '招生类别',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    const { type } = ctx.req.param();
    const link = `http://grs.dlmu.edu.cn/zsgz/${type}.htm`;
    const response = await ofetch(link);

    const $ = load(response);
    const list = $('div.main_conRCb ul li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const a = $item.find('a');
            return {
                title: a.text(),
                link: new URL(a.attr('href')!, link).href,
                pubDate: timezone(parseDate($item.find('span').text()), 8),
            };
        });

    return {
        title: $('title').text(),
        link,
        item: await Promise.all(
            list.map((item) =>
                cache.tryGet(item.link!, async () => {
                    const detailResponse = await ofetch(item.link!);
                    const content = load(detailResponse);
                    item.description = content('div.main_conDiv').html();
                    return item;
                })
            )
        ),
    };
}
