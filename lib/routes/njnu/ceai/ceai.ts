import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import util from './utils';

const TYPE_OPTIONS = [
    { value: 'xygg', label: '学院公告' },
    { value: 'xyxw', label: '学院新闻' },
    { value: 'xszx', label: '学生资讯' },
];

export const route: Route = {
    path: '/ceai/:type',
    categories: ['university'],
    example: '/njnu/ceai/xszx',
    parameters: { type: { description: '分类名', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '计算机与电子信息学院 - 人工智能学院',
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
        case 'xygg':
            title = '学院公告';
            path = '1651';
            break;
        case 'xyxw':
            title = '学院新闻';
            path = '1652';
            break;
        case 'xszx':
            title = '学生资讯';
            path = '1659';
            break;
        default:
            throw new Error(`Unknown type: ${type}`);
    }
    const base = 'http://ceai.njnu.edu.cn/Item/List.asp?ID=' + path;

    const response = await got(base);

    const $ = load(response.data);

    const list = $('span a').toArray();

    const result = await util.ProcessFeed(list, cache);

    return {
        title: '南京师范大学计电人院 - ' + title,
        link: 'http://ceai.njnu.edu.cn/',
        description: '南京师范大学计电人院',
        item: result,
    };
}
