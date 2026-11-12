import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { parseArticle } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'news', label: '最新资讯' },
    { value: 'review', label: '游戏评测' },
    { value: 'video', label: '游戏视频' },
    { value: 'special', label: '巴士首页特稿' },
    { value: 'hardware', label: '硬件资讯' },
];

type Category = 'news' | 'review' | 'video' | 'special' | 'hardware';

const categories = {
    news: '最新资讯',
    review: '游戏评测',
    video: '游戏视频',
    special: '巴士首页特稿',
    hardware: '硬件资讯',
} satisfies Record<Category, string>;

export const route: Route = {
    path: '/list/:category',
    parameters: {
        category: { description: '列表分类，见下表', options: CATEGORY_OPTIONS },
    },
    categories: ['game'],
    example: '/tgbus/list/news',
    radar: [
        {
            source: ['www.tgbus.com/list/:category/'],
            target: '/list/:category',
        },
    ],
    name: '文章列表',
    maintainers: ['Xzonn'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '列表分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');
    const listUrl = `https://www.tgbus.com/list/${category}/`;

    const res = await got(listUrl);
    const $ = load(res.data);
    const list = $('div.special-infocard')
        .toArray()
        .map((item) => {
            const element = $(item);
            const a = element.find('a');
            return {
                title: element.find('div.title').text(),
                link: `https://www.tgbus.com${a.attr('href')}`,
                description: element.find('div.content').text(),
                pubDate: timezone(parseDate(element.find('div.info span:nth-child(3)').text().trim()), 8),
            };
        });

    const out = await pMap(list, parseArticle, { concurrency: 3, stopOnError: false });

    return {
        title: `${categories[category]} - 电玩巴士`,
        description: $('meta[name="description"]').attr('content'),
        link: listUrl,
        item: out,
    };
}
