import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { renderDescription } from './templates/description';

const CATEGORY_OPTIONS = [
    { value: '0', label: '精选' },
    { value: '1', label: '人物' },
    { value: '2', label: '静物' },
    { value: '3', label: '二次元' },
    { value: '4', label: '黑白' },
    { value: '5', label: '自然' },
    { value: '6', label: '美食' },
    { value: '7', label: '电影与游戏' },
    { value: '8', label: '科技与艺术' },
    { value: '9', label: '城市与建筑' },
    { value: '10', label: '萌物' },
    { value: '11', label: '美女' },
];

export const route: Route = {
    path: '/whale/category/:category',
    categories: ['social-media'],
    example: '/dgtle/whale/category/0',
    parameters: { category: { description: '分类 id', options: CATEGORY_OPTIONS } },
    name: '鲸图（分类）',
    maintainers: ['Erriy'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类 id',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const cid = Number(ctx.req.param('category'));

    const categories = ['精选', '人物', '静物', '二次元', '黑白', '自然', '美食', '电影与游戏', '科技与艺术', '城市与建筑', '萌物', '美女'];
    if (!Number.isSafeInteger(cid) || cid < 0 || cid >= categories.length) {
        throw new InvalidParameterError('Invalid category. Use an integer from 0 through 11.');
    }

    const host = 'https://www.dgtle.com';

    const response = await ofetch(`https://opser.api.dgtle.com/v1/whale/index?category_id=${cid}&page=1&per-page=10`);

    const items = response.items.map((item) => ({
        title: item.content,
        pubDate: item.created_at ? parseDate(item.created_at, 'X') : undefined,
        updated: item.updated_at ? parseDate(item.updated_at, 'X') : undefined,
        author: item.author.username,
        description: renderDescription({
            images: (Array.isArray(item.aid_list) ? item.aid_list : [item.attachment]).map((attachment) => ({
                src: attachment.pic_url.split('?', 1)[0],
            })),
        }),
        link: item.attachment.pic_url.split('?', 1)[0],
    }));

    return {
        title: `数字尾巴 - 鲸图 - ${categories[cid]}`,
        description: '分类鲸图',
        link: host,
        item: items,
    };
}
