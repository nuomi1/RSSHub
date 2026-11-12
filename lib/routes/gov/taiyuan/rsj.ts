import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATY_OPTIONS = [
    { value: 'gzdt', label: '工作动态' },
    { value: 'tyxw', label: '太原新闻' },
    { value: 'gggs', label: '通知公告' },
    { value: 'xqdt', label: '县区动态' },
    { value: 'gndt', label: '国内动态' },
    { value: 'tpxw', label: '图片新闻' },
];

const rootURL = 'http://rsj.taiyuan.gov.cn/';

export const route: Route = {
    path: '/rsj/:caty/:page?',
    categories: ['government'],
    example: '/gov/taiyuan/rsj/gggs',
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
            source: ['rsj.taiyuan.gov.cn/zfxxgk/:caty/index.shtml'],
            target: '/rsj/:caty',
        },
    ],
    name: '人力资源和社会保障局政府公开信息',
    maintainers: ['2PoL'],
    handler,
    url: 'rsj.taiyuan.gov.cn/*',
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: '信息类别',
        options: CATY_OPTIONS,
    }),
};

async function handler(ctx) {
    const categoryID = ctx.req.param('caty');
    const pagePath = `/zfxxgk/${categoryID}/index.shtml`;

    const currentURL = new URL(pagePath, rootURL);
    const response = await got(currentURL.href);

    const $ = load(response.data);
    const title = $('.tit').find('a:eq(2)').text();
    const list = $('.RightSide_con ul li')
        .toArray()
        .map((item) => {
            const link = $(item).find('a');
            const date = $(item).find('span.fr');
            return {
                title: link.attr('title')!,
                link: link.attr('href'),
                pubDate: timezone(parseDate(date.text(), 'YYYY-MM-DD'), 8),
            };
        });

    return {
        title: '太原市人力资源和社会保障局 - ' + title,
        link: currentURL.href,
        item: list,
    };
}
