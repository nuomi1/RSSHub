import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

import utils from './utils';

const TYPE_OPTIONS = [
    { value: 'recommend', label: '推荐' },
    { value: 'history', label: '党史' },
    { value: 'stock', label: '豫股' },
    { value: 'business', label: '财经' },
    { value: 'education', label: '投教' },
    { value: 'finance', label: '金融' },
    { value: 'science', label: '科创' },
    { value: 'invest', label: '投融' },
    { value: 'column', label: '专栏' },
];
const TYPE_OPTIONS_DEFAULT = 'recommend';

const { TYPE, parseUrl } = utils;

export const route: Route = {
    path: '/:type?',
    categories: ['new-media'],
    example: '/dahecube',
    parameters: { type: { description: '板块，见下表，默认为推荐', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '新闻',
    maintainers: ['linbuxiao'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '板块',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    if (!Object.hasOwn(TYPE, type)) {
        throw new InvalidParameterError(`Invalid type. Supported types: ${Object.keys(TYPE).join(', ')}`);
    }
    const params = JSON.stringify({
        channelid: TYPE[type].id,
        pno: 1,
        psize: 15,
    });

    const res = await got({
        method: 'post',
        url: 'https://app.dahecube.com/napi/news/pc/list',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        body: params,
    });

    const list = res.data.data.items.map((item) => ({
        title: item.title,
        pubDate: item.pubtime ? timezone(parseDate(item.pubtime, 'YYYY-MM-DD HH:mm:ss'), 8) : undefined,
        author: item.source,
        id: item.recid,
    }));
    const orderedList = ctx.req.query('sorted') === 'false' ? list : list.toSorted((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0));
    const candidates = orderedList.slice(0, getRouteLimit(ctx));

    const items = await Promise.all(
        candidates.map((item) =>
            cache.tryGet(item.id, async () => {
                const detailResponse = await got({
                    method: 'post',
                    url: 'https://app.dahecube.com/napi/news/pc/artinfo',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    },
                    body: JSON.stringify({
                        artid: item.id,
                    }),
                });

                item.description = detailResponse.data.data.content;
                item.link = `https://www.dahecube.com/article.html?artid=${item.id}`;
                delete item.id;
                return item;
            })
        )
    );

    const ret: Data = {
        title: '大河财立方',
        link: parseUrl(type),
        description: `大河财立方 ${TYPE[type].name}`,
        language: 'zh-CN',
        item: items,
    };

    ctx.set('json', ret);
    return ret;
}
