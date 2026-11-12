import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const map = new Map([
    ['top-stories', { title: 'Top Stories', suffix: '/top-stories' }],
    ['health', { title: 'Health', suffix: '/categories/health' }],
    ['crime', { title: 'Crime', suffix: '/categories/crime' }],
    ['politics', { title: 'Politics', suffix: '/categories/politics' }],
    ['business', { title: 'Business', suffix: '/categories/business' }],
    ['tech', { title: 'Tech', suffix: '/categories/tech' }],
    ['culture', { title: 'Culture', suffix: '/categories/culture' }],
    ['sports', { title: 'Sports', suffix: '/categories/sports' }],
    ['weird', { title: 'Weird', suffix: '/categories/weird' }],
    ['1-1-2', { title: '1-1-2', suffix: '/categories/1-1-2' }],
]);

const CATEGORY_OPTIONS = [...map].map(([value, item]) => ({ value, label: item.title }));
const CATEGORY_OPTIONS_DEFAULT = 'top-stories';

export const route: Route = {
    path: '/news/:category?',
    categories: ['new-media'],
    example: '/nltimes/news/top-stories',
    parameters: { category: { description: 'category', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['nltimes.nl/categories/:category'],
            target: '/news/:category',
        },
    ],
    name: 'News',
    maintainers: ['Hivol'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: 'Category',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    const selectedCategory = map.get(category);
    if (!selectedCategory) {
        throw new Error(`Unknown NL Times category: ${category}. Expected one of: ${map.keys().toArray().join(', ')}.`);
    }
    const suffix = selectedCategory.suffix;

    const rootUrl = 'https://www.nltimes.nl';
    const apiUrl = rootUrl + suffix;

    const response = await got({
        method: 'get',
        url: apiUrl,
    });

    const $ = load(response.data);

    const list = $('.news-card')
        .slice(0, 10)
        .toArray()
        .map((elem) => {
            const item = {
                link: $(elem).children('.news-card__title').first().children('a').first().attr('href'),
                title: $(elem).children('.news-card__title').first().children('a').first().text(),
                date: $(elem).children('.news-card__date').first().text(),
                category: $(elem)
                    .children('.news-card__categories')
                    .first()
                    .children('a')
                    .toArray()
                    .map((elem) => $(elem).text()),
            };
            return item;
        });

    const ProcessFeed = (data) => {
        const $ = load(data);

        return $('.news-article--body').html();
    };

    const items = await Promise.all(
        list.map((item) => {
            const title = item.title;
            const date = timezone(parseDate(item.date, 'D MMMM YYYY - HH:mm'), 1); // Central European Time
            const link = rootUrl + item.link;
            const category = item.category;

            return cache.tryGet(link, async () => {
                const response = await got({
                    method: 'get',
                    url: link,
                });

                const description = ProcessFeed(response.data);
                return {
                    title,
                    category,
                    description,
                    pubDate: date,
                    link,
                };
            });
        })
    );

    return {
        title: `NL Times -- ${selectedCategory.title}`,
        language: 'en' as const,
        link: apiUrl,
        description: `NL Times -- ${selectedCategory.title}`,
        item: items,
    };
}
