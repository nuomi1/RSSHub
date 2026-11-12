import { load } from 'cheerio';
import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { processPages } from '../utils';

const CATEGORY_OPTIONS = [
    { value: '1', label: '招生工作' },
    { value: '2', label: '研究生培养' },
    { value: '3', label: '质量管理' },
    { value: '4', label: '学位工作' },
    { value: '5', label: '综合办公室' },
    { value: '6', label: '相关下载' },
];

export const route: Route = {
    path: '/grs/qttz/:category',
    categories: ['university'],
    example: '/ynu/grs/qttz/2',
    parameters: { category: { description: '研究生院通知分类', options: CATEGORY_OPTIONS } },
    features: {
        antiCrawler: true,
    },
    radar: [{ source: ['grs.ynu.edu.cn/*'] }],
    name: '研究生院其他通知',
    maintainers: ['hzcheney'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '研究生院通知分类',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const host = 'http://www.grs.ynu.edu.cn/';
    const { category } = ctx.req.param();
    if (!/^[1-6]$/.test(category)) {
        throw new InvalidParameterError('The category must be an integer from 1 to 6.');
    }
    const dep = ['招生工作', '研究生培养', '质量管理', '学位工作', '综合办公室', '相关下载'];

    const response = await ofetch('http://www.grs.ynu.edu.cn/index.htm');

    const $ = load(response);
    const list = $('#con3:nth-of-type(' + category + ') ul li')
        .slice(0, 6)
        .toArray()
        .map((e) => ({
            path: $('a', e).attr('href') ?? '',
            title: $('a', e).attr('title') ?? '',
            author: dep[Number(category) - 1],
        }));
    const out = await processPages({ list, host, department: 'grs' });

    return {
        title: '云南大学研究生院' + dep[Number(category) - 1] + '通知',
        link: host,
        description: '云南大学研究生院' + dep[Number(category) - 1],
        item: out,
    };
}
