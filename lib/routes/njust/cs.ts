import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { getContent } from './utils';

const map = new Map([
    ['xyxw', { title: '学院新闻', id: '/1817' }],
    ['tzgg', { title: '通知公告', id: '/1820' }],
    ['xsdt', { title: '学术动态', id: '/5790' }],
]);

const TYPE_OPTIONS = [...map].map(([value, item]) => ({ value, label: item.title }));
const TYPE_OPTIONS_DEFAULT = 'xyxw';

const host = 'https://cs.njust.edu.cn';

export const route: Route = {
    path: '/cs/:type?',
    categories: ['university'],
    example: '/njust/cs/xyxw',
    parameters: { type: { description: '分类名，见下表，默认为学院新闻', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '计算机学院',
    maintainers: ['Horacecxk', 'jasongzy'],
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
    const list = $('.news_list li.news');

    return {
        title: `南京理工大学计算机学院 -- ${info.title}`,
        link: siteUrl,
        item: list.toArray().map((item) => ({
            title: $(item).find('.news_title').text(),
            pubDate: timezone(parseDate($(item).find('.news_meta').text(), 'YYYY-MM-DD'), 8),
            link: new URL($(item).find('a').attr('href')!, siteUrl).href,
        })),
    };
}
