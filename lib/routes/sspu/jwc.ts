import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const LIST_ID_OPTIONS = [
    { value: '897', label: '学生专栏' },
    { value: '898', label: '教师专栏' },
];

export const route: Route = {
    path: '/jwc/:listId',
    categories: ['university'],
    example: '/sspu/jwc/897',
    parameters: { listId: { description: '专栏 ID，见下表', options: LIST_ID_OPTIONS } },
    radar: [
        {
            source: ['jwc.sspu.edu.cn/:listId/list.htm'],
            target: '/jwc/:listId',
        },
    ],
    name: '教务处',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'listId',
        description: '专栏 ID',
        options: LIST_ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const listId = ctx.req.param('listId');
    const baseUrl = 'https://jwc.sspu.edu.cn';

    const { data: response, url: link } = await got(`${baseUrl}/${listId}/list.htm`);
    const $ = load(response);

    const list = $('.news_list .news')
        .slice(0, getRouteLimit(ctx, 15))
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const title = $item.find('.news_title a');
            return {
                title: title.attr('title')!,
                link: `${baseUrl}${title.attr('href')}`,
            };
        });

    const items = await pMap(
        list,
        async (item) => {
            const details = await cache.tryGet(`sspu:jwc:detail:v2:${item.link}`, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);

                return {
                    description: $('.wp_articlecontent').html(),
                    pubDate: timezone(parseDate($('.arti_update').text(), 'YYYY-MM-DD HH:mm:ss'), 8),
                };
            });
            return { ...item, ...details };
        },
        { concurrency: 3 }
    );

    return {
        title: $('head title').text(),
        link,
        item: items,
    };
}
