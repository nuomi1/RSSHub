import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const ID_OPTIONS = [
    { value: '2', label: '视频' },
    { value: '4', label: '交互' },
    { value: '3', label: '信息图' },
    { value: '453', label: '数据故事' },
];

export const route: Route = {
    path: '/839studio/:id',
    categories: ['traditional-media'],
    example: '/thepaper/839studio/2',
    parameters: { id: { description: '分类 id，可在分类页 URL 的 cat 参数中找到；全部作品使用 /thepaper/839studio', options: ID_OPTIONS } },
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
    radar: [
        {
            source: ['thepaper.cn/'],
        },
    ],
    name: '澎湃美数课作品集 - 分类',
    maintainers: ['umm233'],
    handler,
    url: 'thepaper.cn/',
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const link = `http://projects.thepaper.cn/thepaper-cases/839studio/?cat=${id}`;

    const response = await got({
        method: 'get',
        url: link,
    });

    const data = response.data;

    const $ = load(data);
    const list = $('div[class=imgtext]');

    const category = $('div[class=lefth]').find('h1').text();
    const desc = $('div[class=leftc]').find('p').text();

    return {
        title: `澎湃美数课作品集-${category}`,
        link,
        description: desc,
        item: list.toArray().map((item) => {
            const $item = $(item);
            return {
                title: $item.find('.archive_up a').text(),
                description: `描述：${$item.find('.imgdown p').text()}`,
                link: $item.find('.archive_up a').attr('href'),
            };
        }),
    };
}
