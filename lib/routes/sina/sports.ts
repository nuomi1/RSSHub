import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { parseArticle } from './utils';

const TYPE_OPTIONS = [
    { value: 'volley', label: '排球' },
    { value: 'swim', label: '游泳' },
    { value: 'pingpang', label: '乒乓球' },
    { value: 'badmin', label: '羽毛球' },
    { value: 'snooker', label: '台球' },
    { value: 'tianjing', label: '田径' },
    { value: 'ticao', label: '体操' },
    { value: 'winter', label: '冰雪' },
    { value: 'sh', label: '射击' },
    { value: 'horse', label: '马术' },
    { value: 'kungfu', label: '拳击搏击' },
    { value: 'ufc', label: 'UFC' },
    { value: 'others', label: '其他' },
];

export const route: Route = {
    path: '/sports/:type',
    name: '体育',
    categories: ['sport'],
    example: '/sina/sports/volley',
    parameters: { type: { description: '运动类型，见下表', options: TYPE_OPTIONS } },
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '运动类型',
        options: TYPE_OPTIONS,
    }),
    maintainers: ['nczitzk'],
    handler,
};

async function handler(ctx) {
    const type = ctx.req.param('type');

    let currentUrl = `https://sports.sina.com.cn/others/${type}.shtml`;
    let query = 'ul.list2 li a';

    if (type === 'ufc') {
        currentUrl = 'http://roll.sports.sina.com.cn/s_ufc_all/index.shtml';
        query = '#d_list ul li span a';
    } else if (type === 'winter' || type === 'horse') {
        currentUrl = `https://sports.sina.com.cn/${type}/`;
        query = '[class^=news-list] .list li a';
    }

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);
    const list = $(query)
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: $item.attr('href')!.replace('http://', 'https://'),
            };
        })
        // The same story can be listed in more than one block of the page
        .filter((item, index, items) => items.findIndex((candidate) => candidate.link === item.link) === index);

    const items = await Promise.all(list.map((item) => parseArticle(item)));

    return {
        title: `${$('title').text().split('_', 1)[0]} - 新浪体育`,
        description: $('meta[name="description"]').attr('content'),
        link: currentUrl,
        item: items,
    };
}
