import { load } from 'cheerio';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'kydt', label: '科研动态' },
];

export const route: Route = {
    path: '/scit/:type',
    categories: ['university'],
    example: '/nju/scit/tzgg',
    parameters: { type: { description: '分类名', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '科学技术处',
    maintainers: ['ret-1'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类名',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type');
    const type_dict = {
        tzgg: ['https://scit.nju.edu.cn/10916/list.htm', '通知公告'],
        kydt: ['https://scit.nju.edu.cn/11003/list.htm', '科研动态'],
    };
    if (!Object.hasOwn(type_dict, type)) {
        throw new InvalidParameterError('Unsupported type. Use tzgg or kydt.');
    }
    const response = await got({
        method: 'get',
        url: type_dict[type][0],
    });

    const data = response.data;

    const $ = load(data);
    const list = $('li.list_item');

    return {
        title: `科学技术处-${type_dict[type][1]}`,
        link: type_dict[type][0],
        item: list.toArray().map((item) => {
            const $item = $(item);
            return {
                title: $item.find('a').attr('title')!,
                link: 'https://scit.nju.edu.cn' + $item.find('a').attr('href'),
                pubDate: timezone(parseDate($item.find('.Article_PublishDate').text(), 'YYYY-MM-DD'), 8),
            };
        }),
    };
}
