import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'online', label: '线上分享' },
    { value: 'offline', label: '线下峰会' },
];
const TYPE_OPTIONS_DEFAULT = 'online';

export const route: Route = {
    path: '/activity/:type?',
    categories: ['programming'],
    example: '/dbaplus/activity',
    parameters: { type: { description: '分类，见下表，默认为线上分享', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '活动',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://dbaplus.cn';
    const currentUrl = `${rootUrl}/activity-${type === 'online' ? '12' : '48'}-1.html`;
    const response = await ofetch(currentUrl);

    const $ = load(response);

    const items = $('.media')
        .toArray()
        .map((element) => {
            const item = $(element);

            return {
                title: item.find('.media-heading').text(),
                link: item.find('.pull-left').attr('href'),
                description: `<img src="${item.find('.media-object').attr('src')}">`,
                pubDate: timezone(parseDate(item.find('.time').text().replace('时间：', '')), 8),
            };
        });

    return {
        title: $('title').text().split('：', 1)[0],
        link: currentUrl,
        item: items,
    };
}
