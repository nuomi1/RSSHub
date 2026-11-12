import { load } from 'cheerio';
import markdownit from 'markdown-it';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CATEGORY_OPTIONS = [
    { value: 'js', label: 'javascript' },
    { value: 'node', label: 'node' },
    { value: 'react', label: 'react' },
];
const CATEGORY_OPTIONS_DEFAULT = 'js';

const md = markdownit({
    html: true,
    breaks: true,
});

export const route: Route = {
    path: '/weekly/:category?',
    categories: ['programming'],
    example: '/docschina/weekly',
    parameters: { category: { description: '周刊分类，见下表，默认为js', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '周刊',
    maintainers: ['daijinru', 'hestudy'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '周刊分类',
        options: CATEGORY_OPTIONS,
    }),
    radar: [
        {
            source: ['docschina.org/news/weekly/:category/:issue', 'docschina.org/news/weekly/:category'],
            target: '/weekly/:category',
        },
        {
            source: ['docschina.org/'],
            target: '/weekly',
        },
    ],
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    if (!['js', 'node', 'react'].includes(category)) {
        throw new InvalidParameterError('Invalid category. Use js, node, or react.');
    }

    const baseURL = 'https://docschina.org';
    const path = `/news/weekly/${category}`;
    const url = `${baseURL}${path}`;
    const { data: res } = await got(url);
    const $ = load(res);

    const title = $('head title').text();
    const dataEl = $('#__NEXT_DATA__');
    const dataText = dataEl.text();
    const data = JSON.parse(dataText);
    const items = await Promise.all(
        data?.props?.pageProps?.data?.slice(0, getRouteLimit(ctx, 10)).map((item) => {
            const link = `${url}/${item.issue}`;
            return cache.tryGet(link, async () => {
                const { data: response } = await got(`${baseURL}/_next/data/${data.buildId}/news/weekly/${category}/${item.issue}.json`);
                return {
                    title: item.title,
                    description: md.render(response.pageProps.content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '')),
                    link,
                    author: item.editors?.join(','),
                    itunes_item_image: item.imageUrl,
                };
            });
        }) || {}
    );

    return {
        title,
        link: url,
        item: items,
    };
}
