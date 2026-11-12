import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'jobopening', label: '人才招聘' },
    { value: 'personnelplan', label: '人才培养' },
    { value: 'news', label: '新闻动态' },
    { value: 'notice', label: '通知公告' },
    { value: 'opinion', label: '专家观点' },
    { value: 'results', label: '研究成果' },
    { value: 'papers', label: '研究论文' },
    { value: 'writings', label: '学术著作' },
    { value: 'policy', label: '形势政策' },
];
const TYPE_OPTIONS_DEFAULT = 'notice';

export const route: Route = {
    path: '/ygafz/:type?',
    categories: ['university'],
    example: '/sysu/ygafz',
    parameters: { type: { description: '分类，见下表，默认为 `notice`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
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
            source: ['ygafz.sysu.edu.cn/:type?'],
        },
    ],
    name: '粤港澳发展研究院',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
    maintainers: ['TonyRL'],
    handler,
};

async function handler(ctx) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    const baseUrl = 'https://ygafz.sysu.edu.cn';
    const url = `${baseUrl}/${type}`;

    const response = await ofetch(url);
    const $ = load(response);

    const list = $('.list-content a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const date = $item.find('.date').text().trim();
            return {
                title: $item.find('p').text(),
                link: `${baseUrl}${$item.attr('href')}`,
                pubDate: date ? timezone(parseDate(date, 'YYYY-MM-DD'), 8) : undefined,
            };
        });

    const items = await pMap(
        list,
        async (item) => ({
            ...item,
            ...(await cache.tryGet(`sysu:ygafz:article:v2:${item.link}`, async () => {
                const data = await ofetch(item.link!);
                const $ = load(data);
                return {
                    author: $('.article-submit')
                        .text()
                        .match(/发布人：(.*)/)?.[1],
                    description: ($('div[data-block-plugin-id="entity_field:node:body"]').html() ?? '') + ($('div[data-block-plugin-id="entity_field:node:attachments"]').html() ?? '') || undefined,
                };
            })),
        }),
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: url,
        item: items,
    };
}
