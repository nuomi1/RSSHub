import { load } from 'cheerio';
import { raw } from 'hono/html';
import { renderToString } from 'hono/jsx/dom/server';
import pMap from 'p-map';

import type { Data, DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'work', label: '夥伴聊聊' },
    { value: 'talk', label: '專案設計' },
    { value: 'news', label: '國內外新聞' },
    { value: 'politics', label: '政治百分百' },
    { value: 'society', label: '社會觀察家' },
    { value: 'psychology-philosophy', label: '心理與哲學' },
    { value: 'science', label: '科學大探索' },
    { value: 'environment-health', label: '環境與健康' },
    { value: 'acg', label: 'ACG 快樂聊' },
    { value: 'book-sharing', label: '好書籍分享' },
    { value: 'other-topics', label: '其它主題' },
];

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/simpleinfo',
    parameters: { category: { description: '分类名', options: CATEGORY_OPTIONS } },
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
            source: ['blog.simpleinfo.cc/shasha77'],
            target: '/',
        },
        {
            source: ['blog.simpleinfo.cc/blog/:category'],
            target: '/:category',
        },
    ],
    name: '志祺七七',
    maintainers: ['haukeng'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx): Promise<Data> {
    const category = ctx.req.param('category');
    const rootUrl = 'https://blog.simpleinfo.cc';
    const link = `${rootUrl}${category ? (category === 'work' || category === 'talk' ? `/blog/${category}` : `/shasha77?category=${category}`) : '/shasha77'}`;
    const response = await got(link);
    const $ = load(response.data);
    const title = `${$('.-active').text()} - 簡訊設計`;
    $('.-ad').remove();

    const list = $('.article-item')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('.title').text(),
                link: $item.find('a').first().attr('href'),
                category: $item.find('.category').text(),
            };
        });

    const items = await pMap(
        list,
        async (item) => {
            const details = await cache.tryGet(`simpleinfo:article:v3:${item.link}`, async () => {
                const result = await got(item.link);
                const content = load(result.data);
                const published = content('meta[property="article:published_time"]').attr('content');
                return {
                    author: content('meta[property="article:author"]').attr('content'),
                    pubDate: published ? timezone(parseDate(published), 8) : undefined,
                    description: renderDescription({
                        image: content('meta[property="og:image"]').attr('content'),
                        description: content('.article-content').first().html() ?? undefined,
                    }),
                };
            });
            return { ...item, ...details };
        },
        { concurrency: 3 }
    );

    return {
        title,
        link,
        language: 'zh-TW',
        item: items,
    };
}

const renderDescription = ({ image, description }: { image?: string; description?: string }): string =>
    renderToString(
        <>
            {image ? <img src={image} /> : null}
            {description ? <>{raw(description)}</> : null}
        </>
    );
