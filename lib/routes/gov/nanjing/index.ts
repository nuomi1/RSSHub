import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'news', label: '南京信息' },
    { value: 'department', label: '部门动态' },
    { value: 'district', label: '各区动态' },
    { value: 'livelihood', label: '民生信息' },
];

export const route: Route = {
    path: '/:category',
    categories: ['government'],
    example: '/gov/nanjing/news',
    parameters: {
        category: { description: '分类名', options: CATEGORY_OPTIONS },
    },
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
    name: '信息公开',
    maintainers: ['ocleo1'],
    handler,
};

const host = 'https://www.nanjing.gov.cn';

const categories = new Map([
    ['news', 'njxx'],
    ['department', 'bmdt'],
    ['district', 'gqdt'],
    ['livelihood', 'msxx'],
]);

async function handler(ctx: Context): Promise<Data> {
    const { category } = ctx.req.param();
    const path = categories.get(category);

    if (!path) {
        throw new Error('Cannot find page');
    }

    const link = `${host}/${path}/`;
    const response = await ofetch(`${link}index.html`);
    const $ = load(response);

    const items = $('.center ul li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const $aTag = $item.find('a');
            const publishedDate = $item.find('span').text();

            return {
                title: $aTag.attr('title') || $aTag.text(),
                pubDate: publishedDate ? timezone(parseDate(publishedDate), 8) : undefined,
                link: new URL($aTag.attr('href')!, link).href,
            };
        });

    const title = $('.zxft_title span').text();

    return {
        title,
        link,
        description: `${title} - ${$('head title').text()}`,
        item: items,
    };
}
