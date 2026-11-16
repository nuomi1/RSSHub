import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { baseUrl as rootUrl, getItem } from './utils';

const config = {
    toutiao: {
        title: '头条',
        url: `${rootUrl}/v9zhuanqu/toutiao/index.htm`,
    },
    qswp: {
        title: '网评',
        url: `${rootUrl}/qswp.htm`,
    },
    qssp: {
        title: '视频',
        url: `${rootUrl}/qssp/index.htm`,
    },
    qslgxd: {
        title: '原创',
        url: `${rootUrl}/qslgxd/index.htm`,
    },
    economy: {
        title: '经济',
        url: `${rootUrl}/economy/index.htm`,
    },
    politics: {
        title: '政治',
        url: `${rootUrl}/politics/index.htm`,
    },
    culture: {
        title: '文化',
        url: `${rootUrl}/culture/index.htm`,
    },
    society: {
        title: '社会',
        url: `${rootUrl}/society/index.htm`,
    },
    cpc: {
        title: '党建',
        url: `${rootUrl}/cpc/index.htm`,
    },
    science: {
        title: '科教',
        url: `${rootUrl}/science/index.htm`,
    },
    zoology: {
        title: '生态',
        url: `${rootUrl}/zoology/index.htm`,
    },
    defense: {
        title: '国防',
        url: `${rootUrl}/defense/index.htm`,
    },
    international: {
        title: '国际',
        url: `${rootUrl}/international/index.htm`,
    },
    books: {
        title: '图书',
        url: `${rootUrl}/books/index.htm`,
    },
    xxbj: {
        title: '学习笔记',
        url: `${rootUrl}/qszq/xxbj/index.htm`,
    },
    llwx: {
        title: '理论文选',
        url: `${rootUrl}/qszq/llwx/index.htm`,
    },
};
const CATEGORY_OPTIONS = Object.entries(config).map(([value, item]) => ({ value, label: item.title }));
const CATEGORY_OPTIONS_DEFAULT = 'toutiao';

export const route: Route = {
    path: '/:category?',
    categories: ['traditional-media'],
    example: '/qstheory',
    parameters: { category: { description: '分类，见下表', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['www.qstheory.cn/v9zhuanqu/:category/index.htm', 'www.qstheory.cn/qszq/:category/index.htm', 'www.qstheory.cn/:category/index.htm'],
        },
    ],
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const requestedLimit = Number(ctx.req.query('limit'));
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 50;

    const currentUrl = config[category].url;
    const response = await ofetch(currentUrl);

    const $ = load(response);

    const list = $('.list-style1 ul li a, .text h2 a, .no-pic ul li a')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: new URL($item.attr('href')!, rootUrl).href,
            };
        })
        // The page shows some articles in more than one section
        .filter((item, index, items) => items.findIndex((candidate) => candidate.link === item.link) === index)
        .slice(0, limit);

    const items = await pMap(list, (item) => cache.tryGet(item.link, () => getItem(item)), { concurrency: 3 });

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
