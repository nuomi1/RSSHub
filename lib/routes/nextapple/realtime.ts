import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'latest', label: '首頁' },
    { value: 'recommend', label: '焦點' },
    { value: 'hit', label: '熱門' },
    { value: 'entertainment', label: '娛樂' },
    { value: 'life', label: '生活' },
    { value: 'gorgeous', label: '女神' },
    { value: 'local', label: '社會' },
    { value: 'politics', label: '政治' },
    { value: 'international', label: '國際' },
    { value: 'finance', label: '財經' },
    { value: 'sports', label: '體育' },
    { value: 'lifestyle', label: '旅遊美食' },
    { value: 'gadget', label: '3C 車市' },
];
const CATEGORY_OPTIONS_DEFAULT = 'latest';

export const route: Route = {
    path: '/realtime/:category?',
    categories: ['new-media'],
    example: '/nextapple/realtime/latest',
    parameters: { category: { description: '類別，見下表，默認為首頁', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['tw.nextapple.com/', 'tw.nextapple.com/realtime/:category'],
        },
    ],
    name: '最新新聞',
    maintainers: ['miles170'],
    handler,
    url: 'tw.nextapple.com/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '類別',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    const currentUrl = `https://tw.nextapple.com/realtime/${category}`;
    const response = await got(currentUrl);
    const $ = load(response.data);
    const items = await pMap(
        $('article.infScroll').toArray(),
        (item) => {
            const link = $(item).find('.post-title').attr('href');
            return cache.tryGet(`${link}:article-content`, async () => {
                const response = await got(link);
                const $ = load(response.data);
                const mainContent = $('#main-content');
                const titleElement = mainContent.find('header h1');
                const title = titleElement.text();
                titleElement.remove();
                const postMetaElement = mainContent.find('.post-meta');
                const category = mainContent.find('header .breadcrumb li').last().text();
                const publishedAt = $('meta[property="article:published_time"]').attr('content');
                const pubDate = publishedAt ? parseDate(publishedAt) : undefined;
                postMetaElement.remove();
                const article = $('.article-body').first();
                const introduction = article
                    .children('header')
                    .children('blockquote, figure, video, iframe, div:has(video), div:has(iframe)')
                    .not('.post-meta, .post-title')
                    .toArray()
                    .map((element) => $.html(element))
                    .join('');
                const description = introduction + (article.children('.post-content').html() || '');

                return {
                    title,
                    author: $('meta[name="author"]').attr('content') || undefined,
                    description,
                    category,
                    pubDate,
                    link,
                };
            });
        },
        { concurrency: 5 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
