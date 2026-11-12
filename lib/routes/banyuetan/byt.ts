import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const TIME_OPTIONS = [
    { value: 'shishidashiku', label: '每周' },
    { value: 'yiyue', label: '每月' },
];
const TIME_OPTIONS_DEFAULT = 'shishidashiku';

export const route: Route = {
    path: '/byt/:time?',
    categories: ['new-media'],
    example: '/banyuetan/byt',
    parameters: { time: { description: '时间，见下表，默认为每周', options: TIME_OPTIONS, default: TIME_OPTIONS_DEFAULT } },
    name: '时事大事库',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'time',
        description: '时间',
        options: TIME_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { time = TIME_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 10);

    const rootUrl = 'http://www.banyuetan.org';
    const currentUrl = `${rootUrl}/byt/${time}/index.html`;
    const response = await ofetch(currentUrl);

    const $ = load(response);

    const list = $('.byt_mian_image_list_con ul li a')
        .slice(0, limit)
        .toArray()
        .map((item) => {
            const $item = $(item);
            const title = $item.attr('title');
            if (title === undefined) {
                return null;
            }
            return {
                link: new URL($item.attr('href')!, rootUrl).href,
                title,
            };
        })
        .filter((item) => item !== null);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link);
                const content = load(detailResponse);

                return {
                    ...item,
                    description: content('#detail_content').html(),
                    author: content('.detail_tit_source').text().replace('来源：', ''),
                    pubDate: timezone(parseDate(content('meta[property="og:release_date"]').attr('content')!), 8),
                };
            })
        )
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
