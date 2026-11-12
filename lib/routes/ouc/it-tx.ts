import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: 'xwdt', label: '新闻动态' },
    { value: 'tzgg', label: '学院活动' },
    { value: '21758', label: '奖助工作获奖情况' },
];
const ID_OPTIONS_DEFAULT = 'xwdt';

export const route: Route = {
    path: '/it/tx/:id?',
    categories: ['university'],
    example: '/ouc/it/tx/xwdt',
    parameters: { id: { description: '默认为 `xwdt`，id过多，这里只举几个例', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['it.ouc.edu.cn/tx/:id/list.htm'],
            target: '/it/tx/:id',
        },
    ],
    name: '信息科学与工程学院团学工作',
    maintainers: ['3401797899'],
    handler,
    url: 'it.ouc.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '编号',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const host = 'https://it.ouc.edu.cn';
    const id = ctx.req.param('id') || ID_OPTIONS_DEFAULT;
    const link = `${host}/tx/${id}/list.htm`;
    const response = await got(link);
    const $ = load(response.data);
    const typeTitle = $('span.Column_Anchor').text();
    const title = $('li.col_title h2').text();

    const list = $('ul.wp_article_list li')
        .toArray()
        .map((e): DataItem & { link: string } => {
            const $e = $(e);
            const a = $e.find('a');
            return {
                title: a.attr('title')!,
                link: new URL(a.attr('href')!, host).href,
                pubDate: timezone(parseDate($e.find('span.Article_PublishDate').text(), 'YYYY-MM-DD'), 8),
            };
        });

    const out = await pMap(
        list,
        async (item) => {
            const description = await cache.tryGet(`ouc:article:body:${item.link}`, async () => {
                const response = await got(item.link);
                const $ = load(response.data);
                return $('.wp_articlecontent').html();
            });
            return { ...item, author: '中国海洋大学信息科学与工程学院', description };
        },
        { concurrency: 3 }
    );

    return {
        title: `信息科学与工程学院团学工作 - ${typeTitle}${title === typeTitle ? '' : title}`,
        description: '中国海洋大学信息科学与工程学院团学工作',
        link,
        item: out,
    };
}
