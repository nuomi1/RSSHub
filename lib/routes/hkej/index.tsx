import { load } from 'cheerio';
import { raw } from 'hono/html';
import { renderToString } from 'hono/jsx/dom/server';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'index', label: '全部新闻' },
    { value: 'stock', label: '港股直擊' },
    { value: 'hongkong', label: '香港財經' },
    { value: 'property', label: '地產新聞' },
    { value: 'china', label: '中國財經' },
    { value: 'international', label: '國際財經' },
    { value: 'current', label: '時事脈搏' },
    { value: 'market', label: '即巿股評' },
    { value: 'announcement', label: '重要通告' },
    { value: 'hkex', label: '港交所通告' },
];
const CATEGORY_OPTIONS_DEFAULT = 'index';

export const route: Route = {
    path: '/:category?',
    categories: ['traditional-media'],
    example: '/hkej/index',
    parameters: { category: { description: '分類，預設為全部新聞', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.hkej.com/instantnews/:category', 'www.hkej.com/instantnews'],
        },
    ],
    name: '即時新聞',
    maintainers: ['TonyRL'],
    handler,
    url: 'hkej.com/',
    description: renderOptionsMarkdownTable({ parameter: 'category', description: '分類', options: CATEGORY_OPTIONS }),
};

function getArticleLink(href: string | undefined, baseUrl: string) {
    if (!href) {
        throw new Error('The Hong Kong Economic Journal listing is missing an article link.');
    }
    const url = new URL(href, baseUrl);
    const articlePath = url.pathname.match(/^(.+\/article\/\d+)(?:\/.*)?$/)?.[1];
    if (!articlePath) {
        throw new Error(`The Hong Kong Economic Journal listing has an invalid article link: ${url.href}`);
    }
    url.pathname = articlePath;
    return url.href;
}

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    const baseUrl = 'https://www.hkej.com';

    const link = `${baseUrl}/instantnews${category === CATEGORY_OPTIONS_DEFAULT ? '' : `/${category}`}`;
    const response = await ofetch.raw(link);
    const cookies = response.headers
        .getSetCookie()
        .map((item) => item.split(';', 1)[0])
        .join(';');
    const $ = load(response._data);

    const list = $('h3 a, h4 a')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: getArticleLink($item.attr('href'), baseUrl),
            };
        });

    const renderDesc = (pics, desc) =>
        renderToString(
            <>
                {pics.map((pic) => (
                    <figure>
                        <img src={pic.href} alt={pic.title} />
                        <figcaption>{pic.title}</figcaption>
                    </figure>
                ))}
                {raw(desc ?? '')}
            </>
        );

    const items = await pMap<DataItem & { link: string }, DataItem>(
        list,
        async (item) => ({
            ...item,
            ...(await cache.tryGet(`hkej:article-details:${item.link}`, async () => {
                const article = await ofetch(item.link, { headers: { cookie: cookies } });
                const content = load(article);

                // fix article image
                const articleImg = (content('div.hkej_detail_thumb_2014 td a').length ? content('div.hkej_detail_thumb_2014 td a') : content('div.thumb td a')).toArray().map((e) => {
                    const $e = content(e);
                    return {
                        href: $e.attr('href'),
                        title: $e.attr('title'),
                    };
                });

                const ldJson = content('script[type="application/ld+json"]:contains("NewsArticle")').text();
                const pubDate = ldJson.match(/"datePublished": ?"?([^",]+)/)?.[1];

                const category = [
                    ...new Set(
                        content('p.info span.cate a, #related-articles-wrapper a font')
                            .toArray()
                            .map((e) => content(e).text())
                            .filter(Boolean)
                    ),
                ];
                return {
                    category,
                    description: renderDesc(articleImg, content('div#article-content').html()),
                    pubDate: pubDate ? parseDate(pubDate) : undefined,
                };
            })),
        }),
        { concurrency: 3 }
    );

    return {
        title: $('head title').text(),
        link,
        item: items,
        language: 'zh-HK' as const,
    };
}
