import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'jxxx', label: '教学信息' },
    { value: 'jxyj', label: '教学研究' },
    { value: 'sjjx', label: '实践教学' },
    { value: 'zljk', label: '质量监控' },
    { value: 'tzgg', label: '通知公告' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg';

const baseUrl = 'https://jwc.xidian.edu.cn';
export const route: Route = {
    path: '/jwc/:category?',
    categories: ['university'],
    example: '/xidian/jwc/tzgg',
    parameters: { category: { description: '通知类别，默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处',
    url: 'jwc.xidian.edu.cn',
    maintainers: ['ShadowySpirits'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '通知类别',
        options: CATEGORY_OPTIONS,
    }),
};
async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const url = `${baseUrl}/${category}.htm`;
    const response = await got(url);
    const $ = load(response.data);
    let items = $('.list ul li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('a').attr('title')!,
                link: new URL($item.find('a').attr('href')!, baseUrl).href,
                pubDate: parseDate($item.find('.con span').text()),
            };
        });
    items = await pMap(
        items,
        (item) =>
            mapResolvedValue(
                cache.tryGet(`xidian:jwc:content:v1:${item.link}`, async () => {
                    const detailResponse = await got(item.link, {
                        headers: {
                            referer: url,
                        },
                    });
                    const content = load(detailResponse.data);
                    content('.tit, .zd, #div_vote_id').remove();
                    return { description: content('.con').html() };
                }),
                (detail) => ({ ...item, ...detail })
            ),
        { concurrency: 3, stopOnError: false }
    );
    return {
        title: $('title').text(),
        link: url,
        item: items,
    };
}
async function mapResolvedValue<T, U>(promise: Promise<T>, mapper: (value: T) => U | Promise<U>): Promise<U> {
    const value = await promise;
    return mapper(value);
}
