import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDateInTimezone } from '@/utils/parse-date-in-timezone';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'news_list', label: '全部分类' },
    { value: 'responsibility', label: '社会责任' },
    { value: 'brand', label: '人员品牌' },
    { value: 'product', label: '产品故事' },
    { value: 'sales', label: '优惠' },
    { value: 'culture', label: '品牌文化' },
    { value: 'event', label: '活动速报' },
];
const CATEGORY_OPTIONS_DEFAULT = 'news_list';

export const route: Route = {
    path: '/cn/:category',
    categories: ['shopping'],
    example: '/mcdonalds/cn/sales+event',
    parameters: { category: { description: '分类名（可用 + 连接多个分类）', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '活动资讯',
    maintainers: ['huyyi'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const categories = category.split('+');
    const baseUrl = 'https://www.mcdonalds.com.cn/news/';

    const newsLists = await pMap(
        categories,
        async (cate) => {
            const response = await ofetch(baseUrl + cate);
            const $ = load(response);
            return $('.news_list .box-container > div')
                .slice(0, 10)
                .toArray()
                .map((item) => $(item).find('a[target]').attr('href'))
                .filter((href) => href !== undefined)
                .map((href) => new URL(href, baseUrl).href);
        },
        { concurrency: 3 }
    );

    const out = await pMap(
        [...new Set(newsLists.flat())],
        (newsUrl) =>
            cache.tryGet(newsUrl, async () => {
                const result = await ofetch(newsUrl);
                const $ = load(result);
                const date = $('h3 ~ time').text();

                return {
                    title: $('h3').text(),
                    link: newsUrl,
                    pubDate: date ? parseDateInTimezone(date.replaceAll('.', '-'), 8) : undefined,
                    description: $('.cmsPage').html(),
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: '麦当劳资讯',
        link: baseUrl,
        item: out,
    };
}
