import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: '', label: '24H' },
    { value: 'day', label: '일간' },
    { value: 'week', label: '주간' },
    { value: 'month', label: '월간' },
];

export const route: Route = {
    path: '/chart/:category?',
    categories: ['multimedia'],
    example: '/melon/chart',
    parameters: { category: { description: 'Category, see below, 24H by default', options: CATEGORY_OPTIONS } },
    name: 'Chart',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { category } = ctx.req.param();

    const rootUrl = 'https://www.melon.com';
    const currentUrl = `${rootUrl}/chart/${category ? category + '/' : ''}index.htm`;
    const response = await ofetch(currentUrl);

    const $ = load(response);

    const items = $('tr[data-song-no]')
        .toArray()
        .map((item) => {
            const $item = $(item);

            const image = $item
                .find('.image_typeAll img')
                .attr('src')!
                .split(/\/melon\//, 1)[0];
            const title = $item.find('.rank01').text();
            const name = $item
                .find('.rank02 > a')
                .toArray()
                .map((artist) => $(artist).text())
                .join(', ');
            const album = $item.find('.rank03').text();

            return {
                link: `${rootUrl}/song/detail.htm?songId=${$item.attr('data-song-no')}`,
                title,
                author: name,
                description: `<img src="${image}"><p>${album}</p>`,
            };
        });

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
