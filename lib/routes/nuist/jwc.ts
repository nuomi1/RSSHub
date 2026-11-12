import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import got, { parseCampusDate } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'jxyw', label: '教学要闻' },
    { value: 'xyjx', label: '学院教学' },
    { value: 'jwgl', label: '教务管理' },
    { value: 'jxyj', label: '教学研究' },
    { value: 'sjjx', label: '教务管理' },
    { value: 'jcjs', label: '教材建设' },
    { value: 'kszx', label: '考试中心' },
];
const CATEGORY_OPTIONS_DEFAULT = 'jxyw';

const baseTitle = '南京信息工程大学-教务处';
const baseUrl = 'https://jwc.nuist.edu.cn';

export const route: Route = {
    path: '/jwc/:category?',
    categories: ['university'],
    example: '/nuist/jwc/jxyw',
    parameters: { category: { description: '默认为教学要闻', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处',
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
    const link = `${baseUrl}/${category === 'jxyw' || category === 'xyjx' ? 'index' : 'xxtz'}/${category}.htm`;

    const response = await got(link);
    const $ = load(response.data);
    const list = $('.main_list ul li')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            return {
                title: $item.find('a').contents().first().text(),
                link: new URL($item.find('a').attr('href')!, baseUrl).href,
                pubDate: parseCampusDate($item.find('.date').text()),
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
        title: baseTitle + '：' + $('.dqwz').find('a').eq(1).text(),
        link,
        item: items,
    };
}
