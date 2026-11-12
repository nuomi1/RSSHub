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
    { value: 'col2', label: '学校要闻' },
    { value: 'col3', label: '综合新闻' },
    { value: 'col4', label: '专题报道' },
    { value: 'col5', label: '深读暨南' },
    { value: 'col6', label: '学者视角' },
    { value: 'col7', label: '学事荟萃' },
    { value: 'col8', label: '媒体暨大' },
    { value: 'col9', label: '教学科研' },
    { value: 'col11', label: '光影暨南' },
];
const TYPE_OPTIONS_DEFAULT = 'col2';

export const route: Route = {
    path: '/yw/:type?',
    categories: ['university'],
    example: '/jnu/yw/col2',
    parameters: { type: { description: '栏目，默认为 `col2`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '暨南要闻',
    maintainers: ['hang333'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '栏目',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();

    const link = `https://news.jnu.edu.cn/${type}.html`;
    const response = await ofetch(link);
    const $ = load(response);

    const list = $('li.list_item')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            const a = $item.find('h4.news_title a');
            const date = $item
                .find('.news_time')
                .text()
                .match(/\d{4}-\d{1,2}-\d{1,2}/)?.[0];
            return {
                title: a.text(),
                link: new URL(a.attr('href')!, link).href,
                description: $item.find('.news_abstract').text().trim(),
                pubDate: date ? timezone(parseDate(date, 'YYYY-MM-DD'), 8) : undefined,
            };
        });

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);
                item.description = $('.article').html() ?? item.description;
                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: $('head title').text(),
        link,
        item: items,
    };
}
