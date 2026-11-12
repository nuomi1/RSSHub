import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { baseUrl, categoryMap } from './data';

const CATEGORY_OPTIONS = [
    { value: 'coverStory', label: '专题报导' },
    { value: 'news', label: '新闻中心' },
    { value: 'review', label: '新品快递' },
    { value: 'ocLab', label: '超频领域' },
    { value: 'digital', label: '流动数码' },
    { value: 'entertainment', label: '生活娱乐' },
    { value: 'member', label: '会员消息' },
    { value: 'price', label: '脑场新闻' },
    { value: 'press', label: '业界资讯' },
    { value: 'latest', label: '最新消息' },
];

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/hkepc/news',
    parameters: { category: { description: '分类，见下表，默认为最新消息', options: CATEGORY_OPTIONS } },
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
            source: ['hkepc.com/'],
            target: '',
        },
    ],
    name: '电脑领域',
    maintainers: ['TonyRL'],
    handler,
    url: 'hkepc.com/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? '';

    const { data: response } = await got(categoryMap[category].url, {
        headers: {
            Referer: baseUrl,
        },
    });

    const $ = load(response);

    const list = $(categoryMap[category].selector)
        .find('a')
        .toArray()
        .map((item): DataItem & { link: string } => ({
            title: $(item).text(),
            link: baseUrl + $(item).attr('href'),
        }));

    const items = await Promise.all(
        list.map(async (item) => {
            const details = await cache.tryGet(`hkepc:article:${item.link}`, async () => {
                const { data: response } = await got(item.link, {
                    headers: {
                        Referer: baseUrl,
                    },
                });

                const $ = load(response);
                const content = $('#view');
                const nextPages = $('#articleFooter .navigation a')
                    .toArray()
                    .map((a) => `${baseUrl}${a.attribs.href}`)
                    .slice(1);

                if (nextPages.length) {
                    const pages = await Promise.all(
                        nextPages.map(async (url) => {
                            const { data: response } = await got(url, {
                                headers: {
                                    referer: item.link,
                                },
                            });
                            const $ = load(response);
                            return $('#view').html();
                        })
                    );
                    content.append(...pages.filter((page) => page !== null));
                }

                // remove unwanted elements
                content.find('#view > div.advertisement').remove();
                content.find('div#comments').remove();
                content.find('div#share_btn').remove();
                content.find('#articleFooter').remove();

                // Non-breaking space U+00A0, `&nbsp;` in html
                // Taken from /caixin/blog.js
                content
                    .find('#view > p')
                    .filter((_, e) => {
                        const [firstChild] = e.children;
                        return firstChild?.type === 'text' && firstChild.data === String.fromCodePoint(160);
                    })
                    .remove();

                // fix lazyload image
                content.find('#view > p > img').each((_, e) => {
                    if (e.attribs.rel) {
                        e.attribs.src = e.attribs.rel;
                    }
                });

                item.author = $('.newsAuthor').text().trim() || $('#articleHead div.author').text().trim();
                item.category = $('div#relatedArticles div.tags a')
                    .toArray()
                    .map((e) => $(e).text().trim());
                item.description = content.html();
                const sourceDate = $('.publishDate').text();
                const pubDate = sourceDate ? parseDate(sourceDate) : undefined;
                item.pubDate = pubDate && Number.isFinite(pubDate.getTime()) ? timezone(pubDate, 8) : undefined;
                item.guid = item.link.slice(0, item.link.lastIndexOf('/'));

                return { author: item.author, category: item.category, description: item.description, pubDate: item.pubDate, guid: item.guid };
            });
            return { ...item, ...details };
        })
    );

    return {
        title: `電腦領域 HKEPC${categoryMap[category].feedSuffix}`,
        link: categoryMap[category].url,
        description: '電腦領域 HKEPC Hardware - 全港 No.1 PC網站',
        language: 'zh-HK' as const,
        item: items,
    };
}
