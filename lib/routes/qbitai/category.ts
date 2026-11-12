import { type Cheerio, load } from 'cheerio';
import { type AnyNode, cloneNode, Document } from 'domhandler';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import parser from '@/utils/rss-parser';

const CATEGORY_OPTIONS = [
    { value: '资讯', label: '资讯' },
    { value: 'ebandeng', label: '数码' },
    { value: 'auto', label: '智能车' },
    { value: 'zhiku', label: '智库' },
    { value: 'huodong', label: '活动' },
];

export const route: Route = {
    path: '/category/:category',
    categories: ['new-media'],
    example: '/qbitai/category/资讯',
    parameters: { category: { description: '分类名，见下表', options: CATEGORY_OPTIONS } },
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
            source: ['qbitai.com/category/:category'],
        },
    ],
    name: '分类',
    maintainers: ['FuryMartin', 'Geraldxm'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
};

export async function getItems(feed: Awaited<ReturnType<typeof parser.parseURL>>) {
    const entries: Array<DataItem & { link: string }> = feed.items.flatMap((item) =>
        item.link
            ? {
                  title: item.title!,
                  pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
                  link: item.link,
                  author: item.creator || '量子位',
                  category: item.categories,
                  description: '', // Initialize description field
              }
            : []
    );

    const resolvedEntries = await pMap(
        entries,
        async (entry) => {
            const details = await cache.tryGet(`${entry.link}:qbitai-main-content`, async () => {
                const response = await ofetch(entry.link!);
                const $ = load(response);
                const body = copyNodes($('.article'));
                body.children('h1').first().remove();
                body.find('.article_info, .line_font').remove();
                const byline = body.children('blockquote').first();
                if (/量子位\s*\|\s*公众号\s*QbitAI/.test(byline.text())) {
                    byline.remove();
                }
                const description = body.html();
                if (!description) {
                    throw new Error(`Could not extract the article content from ${entry.link}`);
                }
                return { description };
            });
            return { ...entry, ...details };
        },
        { concurrency: 3 }
    );

    return resolvedEntries;
}

async function handler(ctx) {
    const category = ctx.req.param('category');
    const url = encodeURI(`https://www.qbitai.com/category/${category}/feed`);

    const feed = await parser.parseURL(url);
    return {
        title: `量子位 - ${category}`,
        link: `https://www.qbitai.com/category/${category}`,
        item: await getItems(feed),
    };
}

function copyNodes<T extends AnyNode>(selection: Cheerio<T>): Cheerio<T> {
    const copy = selection.map((_, node) => cloneNode(node, true));
    const root = new Document(copy.toArray());
    for (const node of copy) {
        node.parent = root;
    }
    return copy;
}
