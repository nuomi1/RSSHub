import type { Context } from 'hono';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'new', label: '最新公告' },
    { value: 'version', label: '版本信息' },
    { value: 'gach', label: '祈愿信息' },
    { value: 'event', label: '活动介绍' },
];
const TYPE_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/bh2/:type?',
    categories: ['game'],
    example: '/mihoyo/bh2/gach',
    parameters: { type: { description: '公告种类，默认为 `all`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '崩坏 2 - 游戏公告',
    maintainers: ['deepred5'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '公告种类',
        options: TYPE_OPTIONS,
    }),
    handler,
    url: 'www.benghuai.com/index/',
};

const typeArr = ['new', 'version', 'gach', 'event'];

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    const baseUrl = 'https://www.benghuai.com';

    const response = await ofetch(`${baseUrl}/main/getIndexNotice`, {
        method: 'POST',
        headers: {
            Referer: `${baseUrl}/index/`,
            'x-requested-with': 'XMLHttpRequest',
        },
        parseResponse: JSON.parse,
    });

    const types = typeArr.includes(type) ? [type] : typeArr;
    const data = types.flatMap((t) => response.data[t].map((item) => ({ ...item, index: typeArr.indexOf(t) + 1 })));
    const list = new Map(data.map((item) => [item.id, item]))
        .values()
        .toArray()
        .map((item): DataItem & { link: string } => ({
            title: item.title,
            pubDate: timezone(parseDate(item.time), 8),
            link: `${baseUrl}/news/?para=${item.index}_${item.id}`,
            id: item.id,
        }));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detail = await ofetch(`${baseUrl}/news/getNoticeByID?id=${item.id}`, {
                    method: 'POST',
                    headers: {
                        Referer: item.link,
                        'x-requested-with': 'XMLHttpRequest',
                    },
                    parseResponse: JSON.parse,
                });
                item.description = detail.data.text;
                return item;
            })
        )
    );

    const title = `崩坏2-${type}`;

    return {
        title,
        link: `${baseUrl}/news/`,
        description: title,
        item: items,
    };
}
