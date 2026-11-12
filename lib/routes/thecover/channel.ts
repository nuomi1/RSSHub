import { load } from 'cheerio';
import pMap from 'p-map';

import type { Data, DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '3892', label: '天下' },
    { value: '3560', label: '四川' },
    { value: '3909', label: '辟谣' },
    { value: '3686', label: '国际' },
    { value: '11', label: '云招考' },
    { value: '3902', label: '30 秒' },
    { value: '3889', label: '拍客' },
    { value: '3689', label: '体育' },
    { value: '1', label: '国内' },
    { value: '4002', label: '帮扶铁军' },
    { value: '12', label: '文娱' },
    { value: '46', label: '宽窄' },
    { value: '4', label: '商业' },
    { value: '21', label: '千面' },
    { value: '17', label: '封面号' },
];
const ID_OPTIONS_DEFAULT = '3892';

const rootUrl = 'https://www.thecover.cn';

const nodes = {
    3892: '天下',
    3560: '四川',
    3909: '辟谣',
    3686: '国际',
    11: '云招考',
    3902: '30秒',
    3889: '拍客',
    3689: '体育',
    1: '国内',
    4002: '帮扶铁军',
    12: '文娱',
    46: '宽窄',
    4: '商业',
    21: '千面',
    17: '封面号',
};

export const route: Route = {
    path: '/channel/:id?',
    categories: ['new-media'],
    example: '/thecover/channel/3560',
    parameters: { id: { description: '对应id,可在频道链接中获取，默认为3892', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '频道',
    maintainers: ['yuxinliu-alex'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '对应id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx): Promise<Data> {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;
    const targetUrl = rootUrl + `/channel_${id}`;
    const resp = await got({
        method: 'get',
        url: targetUrl,
    });
    const $ = load(resp.data);
    const list = $('a.link-to-article')
        .toArray()
        .filter((item) => $(item).attr('href')!.startsWith('/'))
        .map((item): DataItem => ({
            link: rootUrl + $(item).attr('href'),
            title: '',
        }));
    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(detailResponse.data);
                item.title = content('h1', '.main-article').text();
                item.description = content('section.article-content').html();
                const info = content('span', '.props-of-title').not('#original-tag');
                item.author = info.eq(0).text();
                item.pubDate = timezone(parseDate(info.eq(1).text(), 'YYYY-MM-DD HH:mm'), 8);
                return item;
            }),
        { concurrency: 3, stopOnError: false }
    );

    return {
        title: `${nodes[id]}-封面新闻`,
        link: targetUrl,
        description:
            '封面新闻作为华西都市报深度融合转型和打造新型主流媒体的载体，牢固确立移动优先战略，创新移动新闻产品，打造移动传播矩阵，封面新闻的传播力、引导力、影响力和公信力不断得到各方肯定。封面新闻突破千万的用户下载量，呈现出以四川为主阵地的全国分布态势，用户年龄构成以20-35岁为主，“亿万年轻人的生活方式”的定位初步得到体现。',
        language: 'zh-CN',
        item: items,
    };
}
