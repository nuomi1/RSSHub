import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'academy', label: '学术' },
    { value: 'culture', label: '文化' },
    { value: 'announcement', label: '公告' },
];
const TYPE_OPTIONS_DEFAULT = 'announcement';

const baseUrl = 'https://news.uestc.edu.cn';

const map = {
    academy: '/xxgg/xs.htm',
    culture: '/xxgg/wh.htm',
    announcement: '/xxgg/gg.htm',
};

export const route: Route = {
    path: '/news/:type?',
    categories: ['university'],
    example: '/uestc/news/culture',
    parameters: { type: { description: '默认为 `announcement`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
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
            source: ['news.uestc.edu.cn/'],
            target: '/news',
        },
    ],
    name: '新闻中心',
    maintainers: ['achjqz', 'mobyw'],
    handler,
    url: 'news.uestc.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') || TYPE_OPTIONS_DEFAULT;
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError('Unsupported type. Use academy, culture, or announcement.');
    }
    const pageUrl = map[type];

    const response = await got.get(baseUrl + pageUrl);

    const $ = load(response.data);

    const items = $('div.notice-item.clearfix');

    const out = $(items)
        .toArray()
        .map((item) => {
            const $item = $(item);
            const newsTitle = $item.find('a').text();
            const newsLink = new URL($item.find('a').attr('href')!, baseUrl + pageUrl).href;
            const newsDate = parseDate($item.find('div.date-box-sm').text().trim(), 'YYYY.MM-DD', true);
            const newsDescription = $item.find('div.content').text().trim().replace('&nbsp;', '');

            return {
                title: newsTitle,
                link: newsLink,
                description: newsDescription,
                pubDate: Number.isNaN(newsDate.getTime()) ? undefined : timezone(newsDate, 8),
            };
        });

    return {
        title: '新闻网通知',
        link: baseUrl,
        description: '电子科技大学新闻网信息公告',
        item: out,
    };
}
