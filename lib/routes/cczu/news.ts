import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: '6620', label: '常大要闻' },
    { value: '6621', label: '校园快讯' },
    { value: '6687', label: '媒体常大' },
    { value: '6628', label: '时事热点' },
    { value: '6629', label: '高教动态' },
    { value: '6640', label: '网上橱窗' },
    { value: '6645', label: '新媒常大' },
];
const CATEGORY_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/news/:category?',
    categories: ['university'],
    example: '/cczu/news/6620',
    parameters: { category: { description: '可选，默认为 `all`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '新闻网',
    maintainers: ['stdrc'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '可选',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

const baseTitle = '常大新闻网';
const baseUrl = 'https://news.cczu.edu.cn';
const entryUrlRegex = /^\/(20\d{2})\/(\d{2})(\d{2})\/.*$/;

async function handler(ctx: Context) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const pageUrl = baseUrl + (category === 'all' ? '/' : `/${category}/list.htm`);

    const response = await ofetch(pageUrl);

    const $ = load(response);

    return {
        link: pageUrl,
        title: category === 'all' ? baseTitle : `${baseTitle} ${$('title').text()}`,
        item: $('.news_title a')
            .slice(0, 10)
            .toArray()
            .filter((elem) => entryUrlRegex.test(elem.attribs.href))
            .map((elem) => ({
                link: new URL(elem.attribs.href, pageUrl).href,
                title: elem.attribs.title,
                pubDate: timezone(parseDate(elem.attribs.href.replace(entryUrlRegex, '$1-$2-$3')), 8),
            })),
    };
}
