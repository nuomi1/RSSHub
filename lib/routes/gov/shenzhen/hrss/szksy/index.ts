import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATY_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'bmxx', label: '报名信息' },
    { value: 'cjxx', label: '成绩信息' },
    { value: 'hgbz', label: '合格标准' },
    { value: 'hgrygs', label: '合格人员公示' },
    { value: 'zsff', label: '证书发放信息' },
];

const rootURL = 'http://hrss.sz.gov.cn/';

export const route: Route = {
    path: '/hrss/szksy/:caty/:page?',
    categories: ['government'],
    example: '/gov/shenzhen/hrss/szksy/bmxx/2',
    parameters: { caty: { description: '信息类别', options: CATY_OPTIONS }, page: '历史兼容参数，所有值均返回第 1 页，不翻页' },
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
            source: ['hrss.sz.gov.cn/szksy/zwgk/:caty/index.html'],
            target: '/hrss/szksy/:caty',
        },
    ],
    name: '考试院',
    maintainers: ['zlasd'],
    handler,
    url: 'hrss.sz.gov.cn/*',
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: '信息类别',
        options: CATY_OPTIONS,
    }),
};

async function handler(ctx) {
    const categoryID = ctx.req.param('caty');
    const pagePath = `/szksy/zwgk/${categoryID}/index.html`;

    const currentURL = new URL(pagePath, rootURL); // do not use deprecated 'url.resolve'
    const response = await got({ method: 'get', url: currentURL });

    const $ = load(response.data);
    const title = $('.zx_rm_tit span').text().trim();
    const list = $('.zx_ml_list')
        .first()
        .find('ul li:has(div.list_name a)')
        .toArray()
        .map((item) => {
            const tag = $(item).find('div.list_name a');
            const tag2 = $(item).find('span:eq(1)');
            const date = tag2.text().trim();
            const pubDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? timezone(parseDate(date, 'YYYY-MM-DD', true), 8) : undefined;
            return {
                title: tag.text().trim(),
                link: tag.attr('href'),
                pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : undefined,
            };
        });

    return {
        title: '深圳市考试院 - ' + title,
        link: currentURL.href,
        item: list,
    };
}
