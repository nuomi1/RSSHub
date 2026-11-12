import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '2981', label: '通知公告' },
    { value: '2980', label: '新闻动态' },
    { value: '3009', label: '学籍注册' },
    { value: '3011', label: '奖助学金' },
    { value: '...', label: '其他' },
];

const rootUrl = 'http://yjsy.hrbeu.edu.cn';

export const route: Route = {
    path: '/yjsy/list/:id',
    categories: ['university'],
    example: '/hrbeu/yjsy/list/2981',
    parameters: { id: { description: '栏目编号，由 `URL` 中获取。', options: ID_OPTIONS } },
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
            source: ['yjsy.hrbeu.edu.cn/:id/list.htm'],
        },
    ],
    name: '研究生院',
    maintainers: ['Derekmini'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '栏目编号',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id');

    const response = await got(`${rootUrl}/${id}/list.htm`);

    const $ = load(response.data);

    const bigTitle = $('div [id=lanmuInnerMiddleBigClass_right]')
        .find('div [portletmode=simpleColumnAttri]')
        .text()
        .replaceAll(/[\t\n\r ·]/g, '')
        .trim();

    const list = $('li.list_item')
        .toArray()
        .map((item): DataItem => {
            const link = new URL($(item).find('a').attr('href')!, `${rootUrl}/${id}/list.htm`).href;
            return {
                title: $(item).find('a').attr('title')!,
                pubDate: $(item).find('span.Article_PublishDate').text() ? timezone(parseDate($(item).find('span.Article_PublishDate').text()), 8) : undefined,
                link,
            };
        });

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link!, async () => {
                if (item.link!.includes('page.htm')) {
                    const detailResponse = await got(item.link);
                    const content = load(detailResponse.data);
                    item.description = content('div.wp_articlecontent').html();
                } else {
                    item.description = '本文需跳转，请点击标题后阅读';
                }
                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: '研究生院-' + bigTitle,
        link: rootUrl.concat('/', id, '/list.htm'),
        item: items,
    };
}
