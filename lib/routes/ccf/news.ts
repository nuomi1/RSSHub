import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'Media_list', label: 'CCF 新闻' },
    { value: 'Focus', label: 'CCF 聚焦' },
    { value: 'ACM_News', label: 'ACM 信息' },
];
const CATEGORY_OPTIONS_DEFAULT = 'Media_list';

export const route: Route = {
    path: '/news/:category?',
    categories: ['study'],
    example: '/ccf/news',
    parameters: { category: { description: '分类，见下表，默认为 CCF 新闻', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['ccf.org.cn/:category'],
            target: '/news/:category',
        },
        {
            source: ['ccf.org.cn/'],
            target: '/news',
        },
    ],
    name: '新闻',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'https://www.ccf.org.cn';
    const currentUrl = `${rootUrl}/${category}/`;
    const response = await got(currentUrl);

    const $ = load(response.data);

    const list = $('.tit a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')}`,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got(item.link);
                const content = load(detailResponse.data);

                content('.new_info .num').remove();

                item.description = content('.txt').html();
                item.pubDate = timezone(parseDate(content('.new_info span').text()), 8);

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
