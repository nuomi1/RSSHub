import { load } from 'cheerio';

import NotFoundError from '@/errors/types/not-found';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: '0', label: '教务管理' },
    { value: '2', label: '学籍管理' },
    { value: '3', label: '考试管理' },
    { value: '4', label: '选课管理' },
    { value: '5', label: '排课管理' },
];
const TYPE_OPTIONS_DEFAULT = '0';

const host = 'https://jwc.zcmu.edu.cn/';

const map = new Map([
    [0, { title: '教务处 -- 教务管理', id: 'jwgl' }],
    [2, { title: '教务处 -- 学籍管理', id: 'jwgl/xjgl' }],
    [3, { title: '教务处 -- 考试管理', id: 'jwgl/ksgl' }],
    [4, { title: '教务处 -- 选课管理', id: 'jwgl/xkgl' }],
    [5, { title: '教务处 -- 排课管理', id: 'jwgl/pkgl' }],
]);

export const route: Route = {
    path: '/jwc/:type?',
    categories: ['university'],
    example: '/zcmu/jwc/0',
    parameters: { type: { description: '通知模块id', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处',
    maintainers: ['CCraftY'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '通知模块id',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = Number.parseInt(ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT);
    const channel = map.get(type);
    if (!channel) {
        throw new NotFoundError('Invalid notification type. Supported types are 0, 2, 3, 4 and 5.');
    }
    const id = channel.id;
    const currentUrl = `${host}/${id}.htm`;
    const res = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(res.data);
    const items = $('.winstyle196327 tr:lt(20)')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.find('a').attr('title')!,
                link: `https://jwc.zcmu.edu.cn/${$item.find('a').attr('href')}`,
                pubDate: parseDate($item.find('span.timestyle196327').text().trim()),
            };
        });

    return {
        title: channel.title,
        link: currentUrl,
        item: items,
    };
}
