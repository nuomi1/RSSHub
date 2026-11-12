import { load } from 'cheerio';
import pMap from 'p-map';

import type { Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'politics', label: 'Russian Politics & Diplomacy' },
    { value: 'world', label: 'World' },
    { value: 'economy', label: 'Business & Economy' },
    { value: 'defense', label: 'Military & Defense' },
    { value: 'science', label: 'Science & Space' },
    { value: 'emergencies', label: 'Emergencies' },
    { value: 'society', label: 'Society & Culture' },
    { value: 'pressreview', label: 'Press Review' },
    { value: 'sports', label: 'Sports' },
];
const CATEGORY_OPTIONS_DEFAULT = 'politics';

export const route: Route = {
    path: '/:category?',
    categories: ['traditional-media'],
    example: '/tass/politics',
    parameters: { category: { description: 'Category, can be found in URL, `politics` by default', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['tass.com/:category'],
            target: '/:category',
        },
    ],
    name: 'News',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: 'Category',
        options: CATEGORY_OPTIONS,
    }),
};

const language: Language = 'en';

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();

    const link = `https://tass.com/${category}`;
    const { data: categoryPage } = await got(link);
    const $ = load(categoryPage);

    const sectionId = $('.container .section-page')
        .attr('ng-init')!
        .match(/sectionId\s*=\s*(\d+);/);

    const { data: response } = await got.post('https://tass.com/userApi/categoryNewsList', {
        json: {
            sectionId: sectionId![1],
            limit: 20,
            type: 'all',
        },
    });

    const list: Array<{ title: string; description: string; link: string; pubDate: Date }> = response.newsList.map((item) => ({
        title: item.title,
        description: item.lead,
        link: `https://tass.com${item.link}`,
        pubDate: parseDate(item.date, 'X'),
    }));

    const items = await pMap(
        list,
        async (item) => {
            const description = await cache.tryGet(`${item.link}:body:v2`, async () => {
                const { data: response } = await got(item.link);
                const $ = load(response);

                $('.news-media img').each((_, ele) => {
                    if (ele.attribs.src) {
                        ele.attribs.src = ele.attribs.src.replaceAll('/width/1020_b9261fa1', '');
                    }
                });

                return $('.news-header__lead').prop('outerHTML') + ($('.news-media').prop('outerHTML') ?? '') + $('.text-block').html();
            });
            return { ...item, description };
        },
        { concurrency: 3 }
    );

    return {
        title: $('head title').text(),
        link,
        language,
        image: $('head meta[property="og:image"]').attr('content'),
        icon: $('head link[rel="apple-touch-icon"]').attr('href'),
        logo: $('head link[rel="apple-touch-icon"]').attr('href'),
        item: items,
    };
}
