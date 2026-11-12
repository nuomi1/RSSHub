import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'allnews', label: 'All News' },
    { value: '269', label: 'Fermilab features' },
    { value: '55', label: 'Press releases' },
    { value: '12580', label: 'Symmetry features' },
];
const CATEGORY_OPTIONS_DEFAULT = 'allnews';

export const route: Route = {
    path: '/news/:category?',
    categories: ['new-media'],
    example: '/fnal/news',
    parameters: {
        category: { description: 'Category, see below, All News by default', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT },
    },
    name: 'News',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://news.fnal.gov';
    const posts = await ofetch(`${rootUrl}/wp-json/wp/v2/posts`, {
        query: {
            _embed: '',
            ...(category !== 'allnews' && { categories: category }),
        },
    });

    const items = posts.map((post) => ({
        title: post.title.rendered,
        link: post.link,
        description: post.content.rendered,
        pubDate: parseDate(`${post.date_gmt}Z`),
        author: post._embedded?.author?.[0]?.name,
        category: [
            ...new Set(
                post._embedded['wp:term']
                    .flat()
                    .filter((term) => term.taxonomy === 'category' || term.taxonomy === 'post_tag')
                    .map((term) => term.name)
            ),
        ],
    }));

    return {
        title: 'Fermilab News',
        link: `${rootUrl}/newsroom/news/?se=&c=${category}`,
        item: items,
    };
}
