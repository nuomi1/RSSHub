import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'gstt', label: '工商要闻' },
    { value: 'gsdt', label: '工商动态' },
    { value: 'gsxs', label: '学术动态' },
    { value: 'tzggnew', label: '通知公告' },
    { value: 'gsfc', label: '工商融媒' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzggnew';

export const route: Route = {
    path: '/:category?',
    categories: ['university'],
    example: '/jlbtc',
    parameters: { category: { description: '分类，见下表，默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '主页',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();

    const currentUrl = `https://www.jlbtc.edu.cn/sylm/${category}.htm`;
    const response = await ofetch(currentUrl);

    const $ = load(response);

    const list = $('.newslisttitle')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const a = $item.find('.newslisttitlex a');
            const date = $item
                .find('.wapnewsdate')
                .text()
                .match(/\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/)?.[0];
            return {
                title: a.text(),
                link: new URL(a.attr('href')!, currentUrl).href,
                pubDate: date ? timezone(parseDate(date), 8) : undefined,
                description: $item.find('.newslisttitlexx').text(),
            };
        });

    const items = await pMap(
        list,
        (item) =>
            item.link!.startsWith('https://www.jlbtc.edu.cn/')
                ? cache.tryGet(item.link!, async () => {
                      const detailResponse = await ofetch(item.link!);
                      const content = load(detailResponse);

                      item.description = content('.v_news_content').html();

                      return item;
                  })
                : item,
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
