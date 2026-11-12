import { load } from 'cheerio';

import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import playwright from '@/utils/playwright';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'realtimenews', label: '即時' },
    { value: 'hotnews', label: '熱門' },
    { value: 'politic', label: '政治' },
    { value: 'life', label: '生活' },
    { value: 'star', label: '娛樂' },
    { value: 'money', label: '財經' },
    { value: 'world', label: '國際' },
    { value: 'opinion', label: '言論' },
    { value: 'chinese', label: '兩岸' },
    { value: 'armament', label: '軍事' },
    { value: 'society', label: '社會' },
    { value: 'health', label: '健康' },
    { value: 'sports', label: '體育' },
    { value: 'technologynews', label: '科技' },
    { value: 'fortune', label: '運勢' },
    { value: 'tube', label: '有影' },
    { value: 'taiwan', label: '寶島' },
];
const CATEGORY_OPTIONS_DEFAULT = 'realtimenews';

export const route: Route = {
    path: '/:category?',
    categories: ['traditional-media'],
    example: '/chinatimes/realtimenews',
    parameters: { category: { description: '分類，見下表，留空為 `realtimenews`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.chinatimes.com/:category/', 'www.chinatimes.com/'],
        },
    ],
    name: '分類',
    maintainers: ['KingJem'],
    handler,
    url: 'www.chinatimes.com/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分類',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const baseUrl = 'https://www.chinatimes.com';

    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    const link = `${baseUrl}/${category}/?chdtv`;

    const response = await ofetch(link);
    const $ = load(response);
    const context = await playwright();

    const list = $('.articlebox-compact')
        .toArray()
        .slice(0, getRouteLimit(ctx, 20))
        .map((item): DataItem & { category: string[] } => {
            const $item = $(item);
            const a = $item.find('.title a');
            return {
                title: a.text(),
                link: `${baseUrl}${a.attr('href')}?chdtv`,
                guid: `${baseUrl}${a.attr('href')}`,
                pubDate: timezone(parseDate($item.find('time').attr('datetime')!), 8),
                category: $item
                    .find('.category a')
                    .toArray()
                    .map((i) => $(i).text()),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const page = await context.newPage();
                await page.route('**/*', (route) => {
                    const request = route.request();
                    request.resourceType() === 'document' ? route.continue() : route.abort();
                });
                logger.http(`Requesting ${item.link}`);
                await page.goto(item.link!, {
                    waitUntil: 'domcontentloaded',
                });

                const response = await page.content();
                await page.close();
                const $ = load(response);

                item.category = [
                    ...new Set([
                        ...item.category,
                        ...$('.article-hash-tag a')
                            .toArray()
                            .map((i) => $(i).text()),
                    ]),
                ];

                $('.ad, #donate-form-container, .promote-word, .google-news-promote, .article-hash-tag').remove();

                item.description = $('.main-figure').html()! + $('.article-body').html()!;

                return item;
            })
        )
    );

    await context.close();

    return {
        title: $('head title').text(),
        description: $('head meta[name="description"]').attr('content'),
        link,
        language: $('html').attr('lang') as Language,
        image: `${baseUrl}/images/2020/apple-touch-icon.png`,
        item: items,
    };
}
