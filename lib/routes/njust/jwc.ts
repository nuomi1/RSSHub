import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { getContent } from './utils';

const map = new Map([
    ['jstz', { title: '教师通知', id: '/1216' }],
    ['xstz', { title: '学生通知', id: '/1217' }],
    ['xw', { title: '新闻', id: '/1218' }],
    ['xydt', { title: '学院动态', id: '/1219' }],
]);

const TYPE_OPTIONS = [...map].map(([value, item]) => ({ value, label: item.title }));
const TYPE_OPTIONS_DEFAULT = 'xstz';

const host = 'https://jwc.njust.edu.cn';

export const route: Route = {
    path: '/jwc/:type?',
    categories: ['university'],
    example: '/njust/jwc/xstz',
    parameters: { type: { description: '分类名，见下表，默认为学生通知', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处',
    maintainers: ['MilkShakeYoung', 'jasongzy'],
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
    const list = $('div#wp_news_w3').find('tr');

    return {
        title: `南京理工大学教务处 -- ${info.title}`,
        link: siteUrl,
        item: list.toArray().map((item) => ({
            title: $(item).find('a').attr('title') || $(item).find('a').text(),
            pubDate: timezone(parseDate($(item).find('td[width="14%"]').text(), 'YYYY-MM-DD'), 8),
            link: $(item).find('a').attr('href'),
        })),
    };
}
