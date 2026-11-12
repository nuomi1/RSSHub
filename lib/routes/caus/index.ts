import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CATEGORY_OPTIONS = [
    { value: '0', label: '全部' },
    { value: '1', label: '要闻' },
    { value: '2', label: '商业' },
    { value: '3', label: '快讯' },
    { value: '8', label: '财富' },
    { value: '6', label: '生活' },
];
const CATEGORY_OPTIONS_DEFAULT = '0';

// Reason: preserve original category numbers for backward compatibility.
// WordPress category ids from REST API (GET /wp-json/wp/v2/categories).
// Old categories "商业"(2) and "快讯"(3) no longer exist on the new site,
// mapped to closest equivalents: 2→财富(finance), 3→社会(lifestyle).
const categories = {
    0: { title: '全部', slug: '', id: 0 },
    1: { title: '要闻', slug: 'news', id: 101 },
    2: { title: '商业', slug: 'finance', id: 108 },
    3: { title: '快讯', slug: 'lifestyle', id: 106 },
    8: { title: '财富', slug: 'finance', id: 108 },
    6: { title: '生活', slug: 'lifestyle', id: 106 },
};

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/caus',
    parameters: { category: { description: '分类，见下表，默认为全部', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '分类',
    maintainers: ['nczitzk', 'pseudoyu'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

interface PostsQuery {
    per_page: number;
    _embed: string;
    categories?: number;
}

async function handler(ctx) {
    const category = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;
    if (!Object.hasOwn(categories, category)) {
        throw new InvalidParameterError(`Unknown category "${category}". Supported categories are ${Object.keys(categories).join(', ')}.`);
    }
    const cat = categories[category];

    const rootUrl = 'https://caus.com';
    const apiUrl = `${rootUrl}/wp-json/wp/v2/posts`;

    const query: PostsQuery = {
        per_page: Math.min(getRouteLimit(ctx, 20), 100),
        _embed: '',
    };
    if (cat.id) {
        query.categories = cat.id;
    }

    const data = await ofetch(apiUrl, { query });

    const items = data.map((item) => ({
        title: item.title.rendered,
        link: item.link,
        description: item.content.rendered,
        pubDate: parseDate(`${item.date_gmt}Z`),
        author: item._embedded?.author?.[0]?.name,
        category: item._embedded?.['wp:term']?.[0]?.map((t) => t.name),
    }));

    const currentUrl = cat.slug ? `${rootUrl}/category/${cat.slug}/` : rootUrl;

    return {
        title: `${cat.title} - 加美财经`,
        link: currentUrl,
        item: items,
    };
}
