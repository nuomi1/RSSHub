import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATY_OPTIONS = [
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'physiology-or-medicine', label: 'Physiology or Medicine' },
    { value: 'literature', label: 'Literature' },
    { value: 'peace', label: 'Peace' },
    { value: 'economic-sciences', label: 'Economic Science' },
];

export const route: Route = {
    path: '/:caty?',
    categories: ['other'],
    example: '/nobelprize',
    parameters: { caty: { description: 'Category, see below, all by default', options: CATY_OPTIONS } },
    name: 'List',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: 'category',
        options: CATY_OPTIONS,
    }),
};

const categoryPaths = {
    physics: 'all-nobel-prizes-in-physics',
    chemistry: 'all-nobel-prizes-in-chemistry',
    'physiology-or-medicine': 'all-nobel-laureates-in-physiology-or-medicine',
    literature: 'all-nobel-prizes-in-literature',
    peace: 'all-nobel-peace-prizes',
    'economic-sciences': 'all-prizes-in-economic-sciences',
};

async function handler(ctx: Context) {
    const { caty } = ctx.req.param();

    const rootUrl = `https://www.nobelprize.org/prizes/lists/${categoryPaths[caty] ?? 'all-nobel-prizes'}/`;

    const response = await ofetch(rootUrl);

    const $ = load(response);

    const items = $('div.card-prize')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const a = $item.find('h3 a');
            const title = a.text();

            return {
                title,
                link: a.attr('href'),
                description: $item.find('.card-prize--laureates').html(),
            };
        });

    return {
        title: $('title').eq(0).text(),
        link: rootUrl,
        item: items,
    };
}
