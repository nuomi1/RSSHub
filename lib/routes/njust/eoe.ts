import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { getContent } from './utils';

const map = new Map([
    ['tzgg', { title: '通知公告', id: '/1920' }],
    ['xwdt', { title: '新闻动态', id: '/1919' }],
]);

const TYPE_OPTIONS = [...map].map(([value, item]) => ({ value, label: item.title }));
const TYPE_OPTIONS_DEFAULT = 'tzgg';

const host = 'https://eoe.njust.edu.cn';

export const route: Route = {
    path: '/eoe/:type?',
    categories: ['university'],
    example: '/njust/eoe/tzgg',
    parameters: { type: { description: '分类名，见下表，默认为通知公告', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '电光学院',
    maintainers: ['jasongzy'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类名',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    const info = map.get(type);
    if (!info) {
        throw new InvalidParameterError('invalid type');
    }
    const id = info.id;
    const siteUrl = host + id + '/list.htm';

    const html = await getContent(siteUrl, true);
    const $ = load(html);
    const list = $('.news_list li.news:has(.news_title.line1)');

    return {
        title: `南京理工大学电子工程与光电技术学院 -- ${info.title}`,
        link: siteUrl,
        item: list.toArray().map((item) => ({
            title: $(item).find('.line1 a').attr('title') || $(item).find('.line1 a').text(),
            pubDate: timezone(parseDate($(item).find('.line3').text(), 'YYYY-MM-DD'), 8),
            link: new URL($(item).find('.line1 a').attr('href')!, siteUrl).href,
        })),
    };
}
