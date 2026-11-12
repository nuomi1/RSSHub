import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'nba', label: 'NBA' },
    { value: 'zuqiu', label: '足球' },
];
const CATEGORY_OPTIONS_DEFAULT = 'nba';

export const route: Route = {
    path: '/luxiang/:category?',
    categories: ['multimedia'],
    example: '/zhibo8/luxiang/nba',
    parameters: { category: { description: '分类，见下表，默认为 `nba`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['zhibo8.cc/:category/luxiang.htm'],
            target: '/luxiang/:category',
        },
    ],
    name: '录像',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    maintainers: ['TonyRL'],
    handler,
};

async function handler(ctx) {
    const rootUrl = 'https://www.zhibo8.cc';
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `${rootUrl}/${category}/luxiang.htm`;

    const response = await got(link);
    const $ = load(response.data);

    const list = $('.box')
        .toArray()
        .flatMap((item) => {
            const $item = $(item);
            const dateStr = $item.find('h2').text().split(' ', 1)[0];
            return $item
                .find('a')
                .toArray()
                .map((item) => {
                    const href = $(item).attr('href');
                    const timeText = item.previousSibling;
                    if (timeText?.nodeType !== 3) {
                        throw new Error(`zhibo8: no time text before ${href}`);
                    }
                    return {
                        title: `${timeText.data.replace(' | ', '')} ${$(item).text()}`,
                        link: `${rootUrl}${href}`,
                        pubDate: timezone(parseDate(`${href!.replace(`/${category}/`, '').slice(0, 4)} ${dateStr}`, 'YYYY M月D日'), 8),
                    };
                });
        });

    return {
        title: $('head title').text(),
        link,
        image: 'https://www.zhibo8.cc/favicon.ico',
        item: list,
    };
}
