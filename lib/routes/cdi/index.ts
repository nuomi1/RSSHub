import { load } from 'cheerio';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const ID_OPTIONS = [
    { value: '102', label: '樊纲观点' },
    { value: '150', label: '综研观察' },
    { value: '154', label: '综研视点' },
];

const categories = {
    '102': 'fggd',
    '150': 'zygc',
    '154': 'zygd',
};

interface Article {
    title: string;
    url: string;
    abstract?: string;
    author?: string;
    display_publish_time?: number;
    publish_time?: number;
    EXT_tags?: string;
}

export const route: Route = {
    path: '/:id',
    categories: ['new-media'],
    example: '/cdi/150',
    parameters: { id: { description: '分类（必填），见下表', options: ID_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '栏目',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    if (!Object.hasOwn(categories, id)) {
        throw new InvalidParameterError('Available CDI categories: 102, 150, 154.');
    }

    const rootUrl = 'http://www.cdi.org.cn';
    const currentUrl = `${rootUrl}/Research/${categories[id]}/index.html`;
    const page = await ofetch(currentUrl, { responseType: 'text' });
    const $ = load(page);
    const apiPath = $('script')
        .text()
        .match(/['"](\/postmeta\/i\/\d+\.json)['"]/)?.[1];
    if (!apiPath) {
        throw new Error('The CDI category page no longer provides its article API URL.');
    }
    const response = await ofetch<{ category: { name: string }; articles: Article[] }>(new URL(apiPath, rootUrl).href);
    const firstPage = response.articles.toSorted((a, b) => (b.display_publish_time || 0) - (a.display_publish_time || 0)).slice(0, 24);
    const items = await pMap(
        firstPage,
        (article) => {
            const link = new URL(article.url, currentUrl).href;
            return cache.tryGet(link, async (): Promise<DataItem> => {
                const detail = await ofetch(link, { responseType: 'text' });
                const content = load(detail);
                const date = article.display_publish_time || article.publish_time;
                return {
                    title: article.title,
                    link,
                    description: content('#info').html() || article.abstract,
                    author: article.author || undefined,
                    category: article.EXT_tags?.split(',').filter(Boolean),
                    pubDate: date ? parseDate(date, 'X') : undefined,
                };
            });
        },
        { concurrency: 5 }
    );

    return {
        title: `${response.category.name} - 国家高端智库/综合开发研究院`,
        link: currentUrl,
        item: items,
    };
}
