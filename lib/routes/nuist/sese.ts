import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import got, { parseCampusDate } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'tzgg1', label: '通知公告' },
    { value: 'xwkx', label: '新闻快讯' },
    { value: 'xsdt1', label: '学术动态' },
    { value: 'xsgz1', label: '学生工作' },
    { value: 'yjsjy1', label: '研究生教育' },
    { value: 'bkjy1', label: '本科教育' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg1';

const baseTitle = 'NUIST ESE（南信大环科院）';
const baseUrl = 'https://sese.nuist.edu.cn';

export const route: Route = {
    path: '/sese/:category?',
    categories: ['university'],
    example: '/nuist/sese/tzgg1',
    parameters: { category: { description: '默认为通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'NUIST ESE（南信大环科院）',
    maintainers: ['gylidian'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `${baseUrl}/${category}.htm`;

    const response = await got(link);
    const $ = load(response.data);
    const list = $('#ctl00_ctl00_mainbody_rightbody_listcontent_NewsList .gridline')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            return {
                title: $item.find('a').eq(1).attr('title') || $item.find('a').eq(1).text(),
                link: new URL($item.find('a').eq(1).attr('href')!, baseUrl).href,
                category: $item.find('a').eq(0).text(),
                pubDate: parseCampusDate($($item).find('.gridlinedate').text()),
            };
        });

    const items = await pMap(
        list,
        async (item) => ({
            ...item,
            ...(await cache.tryGet(item.link + ':content', async () => {
                const response = await got(item.link);
                const $ = load(response.data);
                return { description: $('[id^="vsb_content"]').first().html() };
            })),
        }),
        { concurrency: 3 }
    );

    return {
        title: baseTitle + '：' + $('.lmtitle').text(),
        description: $('meta[name=description]').attr('content'),
        link,
        item: items,
    };
}
