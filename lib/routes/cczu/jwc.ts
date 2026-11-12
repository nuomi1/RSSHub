import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: '1425', label: '通知公告' },
    { value: '1437', label: '教务新闻' },
    { value: '1485', label: '各类活动与系列讲座' },
    { value: '1487', label: '本科教学工程' },
    { value: '1442', label: '他山之石' },
    { value: '1445', label: '信息快递' },
];
const CATEGORY_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/jwc/:category?',
    categories: ['university'],
    example: '/cczu/jwc/1425',
    parameters: { category: { description: '可选，默认为 `all`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        antiCrawler: true,
    },
    name: '教务处',
    maintainers: ['stdrc'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '可选',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

const baseTitle = '常大教务处';
const baseUrl = 'https://jwc.cczu.edu.cn';
const entryUrlRegex = /^\/(20\d{2})\/(\d{2})(\d{2})\/.*$/;

async function handler(ctx: Context) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const pageUrl = baseUrl + (category === 'all' ? '/' : `/${category}/list.htm`);

    const response = await ofetch(pageUrl);

    const $ = load(response);

    return {
        link: pageUrl,
        title: category === 'all' ? baseTitle : `${baseTitle} ${$('title').text()}`,
        item: $('div[id^="wp_news_w"] a')
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
