import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { ProcessFeed } from './utils';

const TYPE_OPTIONS = [
    { value: 'jstz', label: '教师通知' },
    { value: 'xwdt', label: '新闻动态' },
    { value: 'xstz', label: '学生通知' },
];

export const route: Route = {
    path: '/jwc/:type',
    categories: ['university'],
    example: '/njnu/jwc/xstz',
    parameters: { type: { description: '分类名', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务通知',
    maintainers: ['Shujakuinkuraudo'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类名',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type');
    let title, path;
    switch (type) {
        case 'jstz':
            title = '教师通知';
            path = 'jstz.htm';
            break;
        case 'xwdt':
            title = '新闻动态';
            path = 'xwdt.htm';
            break;
        case 'xstz':
            title = '学生通知';
            path = 'xstz.htm';
            break;
        default:
            throw new Error(`Unknown type: ${type}`);
    }
    const base = 'http://jwc.njnu.edu.cn/index/' + path;

    const response = await got(base);

    const $ = load(response.data);

    const list = $('.list_txt a').toArray();

    const result = await ProcessFeed(list, cache);

    return {
        title: '南京师范大学教务处 - ' + title,
        link: 'http://jwc.njnu.edu.cn/',
        description: '南京师范大学教务处',
        item: result,
    };
}
