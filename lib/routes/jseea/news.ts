import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'zkyw', label: '招考要闻' },
    { value: 'jydt', label: '教育动态' },
    { value: 'zkxx', label: '招考信息' },
    { value: 'zcwj', label: '政策文件' },
    { value: 'yxdt', label: '院校动态' },
];
const TYPE_OPTIONS_DEFAULT = 'zkyw';

const baseUrl = 'https://www.jseea.cn';
const siteTitle = ' - 江苏省教育考试院';

async function loadContent(link) {
    const { data: response } = await got(link);

    const $ = load(response);

    const description = $('#content').html();

    return description;
}

export const route: Route = {
    path: '/news/:type?',
    categories: ['government'],
    example: '/jseea/news/zkyw',
    parameters: { type: { description: '分类，默认为 `zkyw`，具体参数见下表', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['jseea.cn/webfile/news/:type'],
            target: '/news/:type',
        },
    ],
    name: '新闻中心',
    maintainers: ['schen1024'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    const listPageUrl = `${baseUrl}/webfile/news/${type}/`;
    const { data: response } = await got(listPageUrl);
    const $ = load(response);

    const list = $('div.content-list-div ul li a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item
                    .contents()
                    .filter((_, e) => e.nodeType === 3)
                    .text(),
                link: new URL($item.attr('href')!, listPageUrl).href,
                pubDate: timezone(parseDate($item.find('span').text(), 'YYYY-MM-DD'), 8),
            };
        });

    const result = await pMap(
        list,
        async (item) => ({
            ...item,
            description: await cache.tryGet(`jseea:article:${item.link}`, () => loadContent(item.link)),
        }),
        { concurrency: 3 }
    );

    return {
        title: $('head title').text() + siteTitle,
        link: listPageUrl,
        item: result,
    };
}
