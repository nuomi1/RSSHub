import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const typeMap = {
    dynamic: '协会动态',
    announcement: '通知公告',
    industry: '行业动态',
};

const TYPE_OPTIONS = Object.entries(typeMap).map(([value, label]) => ({ value, label }));

export const route: Route = {
    path: '/:type',
    categories: ['government'],
    example: '/sara/announcement',
    parameters: { type: { description: 'dynamic | announcement | industry', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),

    name: '新闻资讯',
    maintainers: ['HChenZi'],
    handler: async (ctx) => {
        const baseUrl = 'http://www.sara.org.cn';
        const type = ctx.req.param('type')!;

        const url = `${baseUrl}/news/${type}.htm`;
        const response = await ofetch(url);
        const $ = load(response);
        const list = $('.newsItem_total > dd')
            .toArray()
            .map((item) => {
                const a = $(item).find('a').first();
                return {
                    link: `${baseUrl}${a.attr('href')}`,
                    title: a.attr('title')!,
                };
            });
        const items = await pMap(list, getFeedItem, { concurrency: 3 });
        return {
            title: typeMap[type],
            link: url,
            item: items,
        };
    },
};

async function getFeedItem(item: { link: string; title: string }): Promise<DataItem> {
    return await cache.tryGet<DataItem>(item.link, async () => {
        const response = await ofetch(item.link);
        const $ = load(response);
        return {
            description: $('.text').html(),
            language: 'zh-CN',
            ...item,
        };
    });
}
