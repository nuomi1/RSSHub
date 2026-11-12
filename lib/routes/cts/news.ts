import pMap from 'p-map';

import type { Data, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'real', label: '即時' },
    { value: 'weather', label: '氣象' },
    { value: 'politics', label: '政治' },
    { value: 'international', label: '國際' },
    { value: 'society', label: '社會' },
    { value: 'sports', label: '運動' },
    { value: 'life', label: '生活' },
    { value: 'money', label: '財經' },
    { value: 'taiwanese', label: '台語' },
    { value: 'local', label: '地方' },
    { value: 'pr', label: '產業' },
    { value: 'general', label: '綜合' },
    { value: 'arts', label: '藝文' },
    { value: 'entertain', label: '娛樂' },
];

type NewsArticle = {
    title: string;
    author: string;
    content: string;
    category: string;
    tags: string[];
    publishTime: string;
    youtubeId?: string;
    coverImage?: { imageUrl: string } | null;
};

type NewsListResponse = {
    data: { articles: Array<{ id: string; link: string }> };
};

const getArticles = async (url: string, limit: number) => {
    const response = await ofetch<NewsListResponse>(url, { query: { page: 1, limit } });
    return response.data.articles;
};

export const route: Route = {
    path: '/:category',
    categories: ['traditional-media'],
    example: '/cts/real',
    parameters: { category: { description: '类别', options: CATEGORY_OPTIONS } },
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
            source: ['news.cts.com.tw/breaking/list'],
            target: '/real',
        },
        {
            source: ['news.cts.com.tw/:category/list'],
            target: '/:category',
        },
        {
            source: ['news.cts.com.tw/:category/index.html'],
        },
    ],
    name: '新聞',
    maintainers: ['miles170'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '类别',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx): Promise<Data> {
    const category = ctx.req.param('category');
    const rootUrl = 'https://news.cts.com.tw';
    const currentUrl = `${rootUrl}/${category === 'real' ? 'breaking' : category}/list`;
    const limit = getRouteLimit(ctx, 20);
    const listPath = category === 'real' || category === 'breaking' ? 'breaking-list' : category === 'taiwanese' ? 'taiwanese-list' : `${category}/list`;
    const apiUrl = `${rootUrl}/api/news/${listPath}`;
    let articles = await getArticles(apiUrl, limit);
    if (!articles.length && limit !== 20) {
        articles = await getArticles(apiUrl, 20);
    }
    const items = await pMap(
        articles.slice(0, limit),
        (item) => {
            const link = new URL(item.link, rootUrl).href;
            return cache.tryGet(link, async () => {
                const response = await ofetch<{ data: { article: NewsArticle } }>(`${rootUrl}/api/news/${item.id}`);
                const article = response.data.article;
                const video = article.youtubeId ? `<iframe src="https://www.youtube-nocookie.com/embed/${article.youtubeId}" allowfullscreen></iframe>` : '';
                return {
                    title: article.title,
                    author: article.author,
                    description: video + article.content,
                    category: [article.category, ...article.tags].filter(Boolean),
                    pubDate: timezone(parseDate(article.publishTime), 8),
                    image: article.coverImage?.imageUrl,
                    link,
                };
            });
        },
        { concurrency: 5 }
    );

    return {
        title: `華視新聞網 - ${category === 'real' || category === 'breaking' ? '即時' : category === 'taiwanese' ? '台語' : (items[0]?.category[0] ?? category)}`,
        link: currentUrl,
        language: 'zh-TW',
        item: items,
    };
}
