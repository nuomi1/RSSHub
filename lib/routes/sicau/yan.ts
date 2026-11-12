import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'xwgg', label: '新闻公告' },
    { value: 'xsbg', label: '学术报告' },
];
const CATEGORY_OPTIONS_DEFAULT = 'xwgg';

export const route: Route = {
    path: '/yan/:category?',
    categories: ['university'],
    example: '/sicau/yan/xwgg',
    parameters: { category: { description: '分类，见下表，默认为新闻公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['yan.sicau.edu.cn/'],
        },
    ],
    name: '研究生院',
    maintainers: ['nczitzk'],
    handler,
    url: 'yan.sicau.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'https://yan.sicau.edu.cn';
    const currentUrl = `${rootUrl}/index/${category}.htm`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const list = $('.list-4 a[title]')
        .slice(0, 10)
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);

            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')!.replace(/^\.\./, '/')}`,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(detailResponse.data);

                item.description = content('.v_news_content').html();
                item.pubDate = timezone(parseDate(detailResponse.data.match(/发布时间: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)[1], 'YYYY-MM-DD HH:mm:ss'), 8);

                return item;
            })
        )
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
