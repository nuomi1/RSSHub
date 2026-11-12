import { load } from 'cheerio';
import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const TYPE_OPTIONS = [
    { value: '0', label: '公告通知' },
    { value: '1', label: '招生工作' },
    { value: '2', label: '新闻资讯' },
    { value: '3', label: '培养工作' },
    { value: '4', label: '学位工作' },
];

export const route: Route = {
    path: '/yjsc/:type',
    categories: ['university'],
    example: '/zzuli/yjsc/0',
    parameters: { type: { description: '分类，见下表', options: TYPE_OPTIONS } },
    name: '研究生处',
    maintainers: ['Fantasia1999'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
};

const map = new Map([
    [0, { title: '公告通知', link: 'https://yjsc.zzuli.edu.cn/ggtz/list.htm' }],
    [1, { title: '招生工作', link: 'https://yjsc.zzuli.edu.cn/2878/list.htm' }],
    [2, { title: '新闻资讯', link: 'https://yjsc.zzuli.edu.cn/2918/list.htm' }],
    [3, { title: '培养工作', link: 'https://yjsc.zzuli.edu.cn/2882/list.htm' }],
    [4, { title: '学位工作', link: 'https://yjsc.zzuli.edu.cn/2890/list.htm' }],
]);

async function handler(ctx: Context) {
    const type = Number.parseInt(ctx.req.param('type') ?? '');
    const category = map.get(type);
    if (!category) {
        throw new InvalidParameterError('Unsupported postgraduate category. Use a type from 0 to 4.');
    }
    const { title, link } = category;

    const response = await ofetch(link);
    const $ = load(response);

    const items = $('div table tbody tr td table tbody tr')
        .slice(0, Math.max(10, getRouteLimit(ctx, 10)))
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.find('td a').attr('title') ?? '',
                link: $item.find('td a').attr('href'),
                pubDate: getPublicationDate($item.find('td div').text()),
            };
        });

    return {
        title: `${title} - 郑州轻工业大学研究生处`,
        link,
        item: items,
    };
}

function getPublicationDate(value: string) {
    if (!value.trim()) {
        return;
    }
    const date = parseDate(value);
    return Number.isFinite(date.getTime()) ? date : undefined;
}
