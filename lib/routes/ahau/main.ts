import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'xnyw', label: '校内要闻' },
    { value: 'ybdt', label: '院部动态' },
];

export const route: Route = {
    path: '/main/:type',
    categories: ['university'],
    example: '/ahau/main/xnyw',
    parameters: { type: { description: '类型名', options: TYPE_OPTIONS } },
    name: '安农大官网新闻',
    maintainers: ['SimonHu-HN'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型名',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    const { type } = ctx.req.param();
    const host = 'https://news.ahau.edu.cn/';
    const link = `${host}index/${type}.htm`;

    const response = await ofetch(link);
    const $ = load(response);

    const title = $('.listing > h2').text().trim();

    const list = $('.newlist02 li a').slice(0, 10).toArray();

    const result = await Promise.all(
        list.map((item) => {
            const $item = $(item);
            const itemUrl = new URL($item.attr('href')!, link).href;
            const itemTitle = $item.attr('title')!;
            const pubDate = timezone(parseDate($item.find('span').text()), 8);
            return cache.tryGet(itemUrl, async () => {
                const detail = await ofetch(itemUrl);
                const $$ = load(detail);
                return {
                    title: itemTitle,
                    link: itemUrl,
                    author: '安农大新闻',
                    guid: itemUrl,
                    description: $$('.v_news_content').html(),
                    pubDate,
                };
            });
        })
    );

    return {
        title: `安徽农业大学新闻网 - ${title}`,
        link,
        description: `安徽农业大学新闻网 - ${title}`,
        item: result,
    };
}
