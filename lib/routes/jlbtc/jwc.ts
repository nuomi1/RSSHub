import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { Data, DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'index/tpxw', label: '教务新闻' },
    { value: 'index/tzgg', label: '通知公告' },
    { value: 'szdw/jwgl', label: '教务管理' },
    { value: 'jjj', label: '教师发展' },
    { value: 'xjkwgz', label: '学籍考务工作' },
    { value: 'zyjs', label: '教学建设' },
];
const CATEGORY_OPTIONS_DEFAULT = 'index/tzgg';

export const route: Route = {
    path: '/jwc/:category{.+}?',
    categories: ['university'],
    example: '/jlbtc/jwc',
    parameters: { category: { description: '分类，见下表，默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '教务处',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context): Promise<Data> {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://jwc1.jlbtc.edu.cn';
    const currentUrl = `${rootUrl}/${category}.htm`;
    const response = await ofetch(currentUrl);

    const $ = load(response);

    const list = $('li a[target="_blank"]')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: new URL($item.attr('href')!, currentUrl).href,
            };
        });

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await ofetch(item.link!);
                const content = load(detailResponse);

                item.description = content('.v_news_content').html();
                const date = content('.timestyle2172')
                    .text()
                    .match(/\d{4}-\d{1,2}-\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/)?.[0];
                item.pubDate = date ? timezone(parseDate(date), 8) : undefined;

                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
