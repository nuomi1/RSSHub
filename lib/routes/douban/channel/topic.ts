import { html } from 'hono/html';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const NAV_OPTIONS = [
    { value: 'default', label: '默认' },
    { value: 'hot', label: '热门' },
    { value: 'new', label: '最新' },
];
const NAV_OPTIONS_DEFAULT = 'default';

export const route: Route = {
    path: '/channel/:id/:nav?',
    categories: ['social-media'],
    example: '/douban/channel/30168934/hot',
    parameters: { id: '频道id', nav: { description: '专题分类，可选，默认为 default', options: NAV_OPTIONS, default: NAV_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '频道专题',
    maintainers: ['umm233'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'nav',
        description: '专题分类',
        options: NAV_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const nav = ctx.req.param('nav') || NAV_OPTIONS_DEFAULT;
    const link = `https://www.douban.com/channel/${id}`;

    const channel_info_response = await got({
        method: 'get',
        url: `https://m.douban.com/rexxar/api/v2/elessar/channel/${id}`,
        headers: {
            Referer: link,
        },
    });

    const response = await got({
        method: 'get',
        url: `https://m.douban.com/rexxar/api/v2/lembas/channel/${id}/feed?ck=null&for_mobile=1&start=0&count=20&nav=${nav}`,
        headers: {
            Referer: link,
        },
    });

    const channel_name = channel_info_response.data.title;
    const data = response.data.items;
    let nav_name: string;

    switch (nav) {
        case 'hot':
            nav_name = '热门';
            break;
        case 'new':
            nav_name = '最新';
            break;
        default:
            nav_name = '默认';
            break;
    }

    return {
        title: `豆瓣${channel_name}频道-${nav_name}动态`,
        link,
        description: `豆瓣${channel_name}频道专题下的${nav_name}动态`,

        item: data
            .map((item) => {
                if (item.external_payload.items === undefined) {
                    const description = String(html`<p>${item.abstract}</p>`);

                    return {
                        title: item.title,
                        description,
                        author: item.author?.name,
                        pubDate: item.create_time ? timezone(parseDate(item.create_time), 8) : undefined,
                        link: item.url,
                    };
                }
                return null;
            })
            .filter(Boolean),
    };
}
