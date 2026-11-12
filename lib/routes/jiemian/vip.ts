import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Data, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { feedMeta, fetchArticle, parseCardList } from './common';

const ID_OPTIONS = [
    { value: '12', label: '[投资早晚报](https://www.jiemian.com/pro/lists/12.html)' },
    { value: '20', label: '[宏观晚 6 点](https://www.jiemian.com/pro/lists/20.html)' },
    { value: '21', label: '[打新早报](https://www.jiemian.com/pro/lists/21.html)' },
    { value: '13', label: '[盘前机会前瞻](https://www.jiemian.com/pro/lists/13.html)' },
    { value: '14', label: '[公告快评](https://www.jiemian.com/pro/lists/14.html)' },
    { value: '15', label: '[盘中必读](https://www.jiemian.com/pro/lists/15.html)' },
    { value: '16', label: '[金股挖掘](https://www.jiemian.com/pro/lists/16.html)' },
    { value: '17', label: '[调研早知道](https://www.jiemian.com/pro/lists/17.html)' },
    { value: '18', label: '[研报新知](https://www.jiemian.com/pro/lists/18.html)' },
    { value: '1', label: '[大势侦察](https://www.jiemian.com/pro/lists/1.html)' },
    { value: '19', label: '[市场风向标](https://www.jiemian.com/pro/lists/19.html)' },
];

export const route: Route = {
    path: '/pro/lists/:id',
    parameters: { id: { description: '分类 id，见下表，可在对应分类页 URL 中找到', options: ID_OPTIONS } },
    name: 'VIP',
    example: '/jiemian/pro/lists/12',
    maintainers: ['nczitzk', 'pseudoyu'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx: Context): Promise<Data> {
    const { id } = ctx.req.param();
    const limit = getRouteLimit(ctx, 20);

    const currentUrl = `https://www.jiemian.com/pro/lists/${id}.html`;
    const [pageResponse, listResponse] = await Promise.all([
        ofetch(currentUrl),
        ofetch<string>('https://a.jiemian.com/index.php', {
            query: {
                m: 'newLists',
                a: 'loadMore',
                tid: id,
                page: 1,
                tpl: 'sub-card',
                cid: '',
                repeat: '',
                list_type: 'pay',
            },
        }),
    ]);

    const { html } = JSON.parse(listResponse.slice(listResponse.indexOf('(') + 1, listResponse.lastIndexOf(')')));
    const list = parseCardList(html);

    const items = await Promise.all(list.slice(0, limit).map((item) => fetchArticle(item)));

    return {
        item: items,
        ...feedMeta(load(pageResponse), currentUrl),
    };
}
