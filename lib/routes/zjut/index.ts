import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '4526', label: '学术探索' },
    { value: '4527', label: '三创・人物' },
    { value: '4528', label: '通知公告' },
    { value: '5389', label: '美誉工大' },
    { value: '5390', label: '智库工大' },
    { value: 'xsdt_4662', label: '学术动态' },
];
const TYPE_OPTIONS_DEFAULT = '4528';

const host = 'https://www.zjut.edu.cn';

export const route: Route = {
    path: '/:type?',
    categories: ['university'],
    example: '/zjut/4528',
    parameters: { type: { description: '板块 id，默认为 4528，即通知公告', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['www.zjut.edu.cn/:type/list.htm'],
            target: '/:type',
        },
    ],
    name: '首页',
    maintainers: ['junbaor'],
    handler,
    url: 'www.zjut.edu.cn',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '板块 id',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `${host}/${type}/list.htm`;

    const response = await ofetch(link);
    const $ = load(response);

    const list = $('.col_news_list .news_list li.news')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            const a = $item.find('.news_title a');

            return {
                title: a.text(),
                link: new URL(a.attr('href')!, host).href,
                pubDate: timezone(parseDate($item.find('.news_meta').text(), 'YYYY-MM-DD'), 8),
            };
        });

    const items = await pMap(
        list,
        async (item) => {
            if (!item.link.startsWith(`${host}/`)) {
                return item;
            }

            const description = await cache.tryGet(`zjut:index:details:${item.link}`, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);

                return $('.wp_articlecontent').html();
            });
            return { ...item, description };
        },
        { concurrency: 3 }
    );

    return {
        title: `浙江工业大学 - ${$('head title').text()}`,
        link,
        item: items,
    };
}
