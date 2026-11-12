import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import { getPlaywrightPage } from '@/utils/playwright';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const baseUrl = 'https://cqe.uestc.edu.cn/';

const mapUrl = {
    hdyg: 'xwgg/hdyg.htm', // Event announcements
    tzgg: 'xwgg/gstz.htm', // Announcements
};

const mapTitle = {
    hdyg: '活动预告',
    tzgg: '通知公告',
};

const TYPE_OPTIONS = Object.entries(mapTitle).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS_DEFAULT = 'tzgg';

export const route: Route = {
    path: '/cqe/:type?',
    categories: ['university'],
    example: '/uestc/cqe/tzgg',
    parameters: { type: { description: '默认为 `tzgg`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
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
            source: ['cqe.uestc.edu.cn/'],
            target: '/cqe',
        },
    ],
    name: '文化素质教育中心',
    maintainers: ['truobel', 'mobyw'],
    handler,
    url: 'cqe.uestc.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') || TYPE_OPTIONS_DEFAULT;
    if (!Object.hasOwn(mapUrl, type)) {
        throw new InvalidParameterError('Unsupported type. Use hdyg or tzgg.');
    }
    const pageUrl = mapUrl[type];

    const { page, destroy } = await getPlaywrightPage(baseUrl + pageUrl, {
        closeTimeout: 0,
        gotoConfig: { waitUntil: 'networkidle' },
        onBeforeLoad: async (page) => {
            await page.route('**/*', (route) => {
                const request = route.request();
                request.resourceType() === 'document' || request.resourceType() === 'script' ? route.continue() : route.abort();
            });
        },
    });
    let content: string;
    try {
        content = await page.content();
    } finally {
        await destroy();
    }

    const $ = load(content);

    const items = $('div.Newslist li');

    const out = $(items)
        .toArray()
        .map((item) => {
            const $item = $(item);
            const newsTitle = $item.find('a').attr('title');
            const newsLink = baseUrl + $item.find('a').attr('href')!.slice(3);
            const newsDate = $item
                .find('span')
                .text()
                .match(/\d{4}-\d{2}-\d{2}/)?.[0];
            const parsedDate = newsDate ? parseDate(newsDate, 'YYYY-MM-DD', true) : undefined;
            const newsPubDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? timezone(parsedDate, 8) : undefined;

            return {
                title: newsTitle!,
                link: newsLink,
                pubDate: newsPubDate,
            };
        });

    return {
        title: `大学生文化素质教育中心-${mapTitle[type]}`,
        link: baseUrl,
        description: '电子科技大学大学生文化素质教育中心通知',
        item: out,
    };
}
