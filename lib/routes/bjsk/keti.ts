import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '402881027cbb8c6f017cbb8e17710002', label: '通知公告' },
    { value: '2c908aee818e04f401818e08645c0002', label: '资料下载' },
];
const ID_OPTIONS_DEFAULT = '402881027cbb8c6f017cbb8e17710002';

export const route: Route = {
    path: '/keti/:id?',
    categories: ['government'],
    example: '/bjsk/keti',
    parameters: { id: { description: '分类 id，见下表，默认为通知公告', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['keti.bjsk.org.cn/indexAction!to_index.action', 'keti.bjsk.org.cn/'],
            target: '/keti',
        },
    ],
    name: '基金项目管理平台',
    maintainers: ['nczitzk'],
    handler,
    url: 'keti.bjsk.org.cn/indexAction!to_index.action',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;
    const limit = getRouteLimit(ctx, 100);

    const rootUrl = 'https://keti.bjsk.org.cn';
    const currentUrl = `${rootUrl}/articleAction!to_moreList.action?entity.columnId=${id}&pagination.pageSize=${limit}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('a.news')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const date = $item.find('.date').text();

            return {
                title: $item.find('.zizizi').text(),
                link: `${rootUrl}${$item.attr('href')}`,
                pubDate: date ? timezone(parseDate(date), 8) : undefined,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);
                const date = content('div.d_information p span').first().text();

                item.description = content('.d_text').html();
                if (!item.pubDate && date) {
                    item.pubDate = timezone(parseDate(date), 8);
                }
                item.author = content('div.d_information p span').last().text();

                return item;
            })
        )
    );

    return {
        title: `北京社科基金项目管理平台 - ${$('.noticetop').text()}`,
        link: currentUrl,
        item: items,
    };
}
