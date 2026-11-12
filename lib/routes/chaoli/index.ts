import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CHANNEL_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'math', label: '数学' },
    { value: 'physics', label: '物理' },
    { value: 'chem', label: '化学' },
    { value: 'biology', label: '生物' },
    { value: 'astro', label: '天文' },
    { value: 'tech', label: '技术' },
    { value: 'admin', label: '管理' },
    { value: 'announ', label: '公告' },
    { value: 'others', label: '其他' },
    { value: 'lang', label: '语言' },
    { value: 'socsci', label: '社科' },
    { value: 'sci-fi', label: '科幻' },
    { value: 'collections', label: '辑录' },
];
const CHANNEL_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/:channel?',
    categories: ['bbs'],
    example: '/chaoli',
    parameters: { channel: { description: '板块，见下表，默认为全部', options: CHANNEL_OPTIONS, default: CHANNEL_OPTIONS_DEFAULT } },
    name: '板块',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'channel',
        description: '板块',
        options: CHANNEL_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { channel = CHANNEL_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://chaoli.club';
    const currentUrl = `${rootUrl}/index.php/conversations/${channel}`;
    const response = await ofetch(currentUrl);
    const $ = load(response);

    const list = $('.title a')
        .slice(0, 10)
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')}`,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link);
                const content = load(detailResponse);

                return {
                    ...item,
                    author: content('.info h3').eq(0).text(),
                    description: content('.postBody').eq(0).html(),
                    pubDate: parseDate(Number.parseInt(content('.info .time').attr('data-timestamp')!) * 1000),
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
