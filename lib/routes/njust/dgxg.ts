import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { getContent } from './utils';

const map = new Map([
    ['gstz', { title: '公示通知', id: '/6509' }],
    ['xswh', { title: '学术文化', id: '/6511' }],
    ['jyzd', { title: '就业指导', id: '/6510' }],
]);

const TYPE_OPTIONS = [...map].map(([value, item]) => ({ value, label: item.title }));
const TYPE_OPTIONS_DEFAULT = 'gstz';

const host = 'https://dgxg.njust.edu.cn';

export const route: Route = {
    path: '/dgxg/:type?',
    categories: ['university'],
    example: '/njust/dgxg/gstz',
    parameters: { type: { description: '分类名，见下表，默认为公示通知', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '电光学院研学网',
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
    const list = $('ul.wp_article_list').find('li');

    return {
        title: `南京理工大学电光学院研学网 -- ${info.title}`,
        link: siteUrl,
        item: list.toArray().map((item) => ({
            title: $(item).find('a').attr('title') || $(item).find('a').text(),
            pubDate: timezone(parseDate($(item).find('span.Article_PublishDate').text(), 'YYYY-MM-DD'), 8),
            link: $(item).find('a').attr('href'),
        })),
    };
}
