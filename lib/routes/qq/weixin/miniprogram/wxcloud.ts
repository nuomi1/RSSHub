import { type Cheerio, load } from 'cheerio';
import { type AnyNode, cloneNode, Document } from 'domhandler';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATY_OPTIONS = [
    { value: 'cloud-sdk', label: '小程序基础库更新日志（云开发部分）' },
    { value: 'ide', label: 'IDE 云开发 & 云控制台更新日志' },
    { value: 'server-sdk', label: 'wx-server-sdk 更新日志' },
];
const CATY_OPTIONS_DEFAULT = 'cloud-sdk';

export const route: Route = {
    path: '/weixin/miniprogram/wxcloud/:caty?',
    categories: ['programming'],
    example: '/qq/weixin/miniprogram/wxcloud/cloud-sdk',
    parameters: { caty: { description: '日志分类，默认为 cloud-sdk', options: CATY_OPTIONS, default: CATY_OPTIONS_DEFAULT } },
    name: '云开发更新日志',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: '日志分类',
        options: CATY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { caty = CATY_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference/changelog-${caty}.html`;
    const response = await ofetch(link);
    const $ = load(response);
    const name = copyNodes($('#docContent .content h1')).find('a.header-anchor').remove().end().text();

    return {
        title: name,
        link,
        item: $('#docContent .content h3')
            .toArray()
            .map((item) => {
                const $item = $(item);
                const title = copyNodes($item).find('a.header-anchor').remove().end().text();
                const date = /\d{4}\.\d{2}\.\d{2}/.exec(title)?.[0];
                return {
                    title,
                    description: $item
                        .nextUntil('h2, h3')
                        .toArray()
                        .map((element) => $.html(element))
                        .join(''),
                    pubDate: date ? timezone(parseDate(date, 'YYYY.MM.DD'), 8) : undefined,
                    link: link + $item.find('a.header-anchor').attr('href'),
                };
            }),
        description: name,
    };
}

function copyNodes<T extends AnyNode>(selection: Cheerio<T>): Cheerio<T> {
    const copy = selection.map((_, node) => cloneNode(node, true));
    const root = new Document(copy.toArray());
    for (const node of copy) {
        node.parent = root;
    }
    return copy;
}
