import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { ossUrl, ProcessFeed, rootUrl } from './utils';

const ID_OPTIONS = [
    { value: '1', label: '文章点击排行' },
    { value: '10', label: '最近更新文章' },
    { value: '11', label: '文章推荐排行' },
];
const ID_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/toplist/:id?/:period?',
    categories: ['reading'],
    example: '/aisixiang/toplist/1/7',
    parameters: { id: { description: '类型', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT }, period: '范围, 仅适用于点击排行榜, 可选一天(1)，一周(7)，一月(30)，所有(-1)，默认为一天' },
    name: '排行',
    maintainers: ['HenryQW', 'nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '类型',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const { id = '1', period = ID_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 30);

    const currentUrl = new URL(`toplist${id ? `?id=${id}${id === '1' ? `&period=${period}` : ''}` : ''}`, rootUrl).href;

    const { data: response } = await got(currentUrl);

    const $ = load(response);

    const title = `${$('a.hl').text()}${$('title').text().split('_', 1)[0]}`;

    const items = $('div.tops_list')
        .slice(0, limit)
        .toArray()
        .map((item) => {
            const $item = $(item);

            const a = $item.find('div.tips a');

            return {
                title: a.text(),
                link: new URL(a.prop('href')!, rootUrl).href,
                author: $item.find('div.name').text(),
                pubDate: parseDate($item.find('div.times').text()),
            };
        });

    return {
        item: await ProcessFeed(limit, items),
        title: `爱思想 - ${title}`,
        link: currentUrl,
        language: 'zh-CN' as const,
        image: new URL('images/logo_toplist.jpg', ossUrl).href,
        subtitle: title,
    };
}
