import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const typeNames = {
    0: '全部',
    109: '手机',
    110: '平板',
    111: '电脑',
    112: '生活',
    113: '相机',
    114: '影音',
    115: '外设',
    116: '公告',
};

const TYPE_ID_OPTIONS = Object.entries(typeNames).map(([value, label]) => ({ value, label }));
const TYPE_ID_OPTIONS_DEFAULT = '0';

export const route: Route = {
    path: '/trade/:typeId?',
    categories: ['social-media'],
    example: '/dgtle/trade/111',
    parameters: { typeId: { description: '分类 id，默认为全部', options: TYPE_ID_OPTIONS, default: TYPE_ID_OPTIONS_DEFAULT } },
    name: '闲置（分类）',
    maintainers: ['xyqfer', 'hoilc'],
    description: renderOptionsMarkdownTable({
        parameter: 'typeId',
        description: '分类 id',
        options: TYPE_ID_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { typeId = TYPE_ID_OPTIONS_DEFAULT } = ctx.req.param();

    const url = 'https://www.dgtle.com/sale';

    const response = await ofetch(`https://www.dgtle.com/sale/getList/${typeId}?page=1&last_id=0`, {
        headers: {
            Referer: url,
        },
    });

    const typeName = typeNames[typeId] ?? typeId;
    const list = response.data.dataList;

    return {
        title: `数字尾巴 - 闲置 - ${typeName}`,
        link: url,
        item: list.map((item) => ({
            title: item.title,
            author: item.user.username,
            description: `<p>价格: ¥${item.price}</p><p>地址: ${item.address}</p><p>${item.content}</p><img src="${item.cover}" style="max-width: 100%;"/>`,
            pubDate: parseDate(item.created_at * 1000),
            link: `https://www.dgtle.com/sale-${item.id}-1.html`,
        })),
    };
}
