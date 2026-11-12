import pMap from 'p-map';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getRollNewsList, parseArticle, parseRollNewsList } from '../utils';

const LID_OPTIONS = [
    { value: '1686', label: '国内滚动' },
    { value: '1687', label: '宏观经济' },
    { value: '1690', label: '金融新闻' },
    { value: '1688', label: '地方经济' },
    { value: '1689', label: '部委动态' },
    { value: '3231', label: '今日财经 TOP10' },
];
const LID_OPTIONS_DEFAULT = '1686';

export const route: Route = {
    path: '/finance/china/:lid?',
    categories: ['new-media'],
    example: '/sina/finance/china',
    parameters: { lid: { description: '分区 id，见下表，默认为 `1686`', options: LID_OPTIONS, default: LID_OPTIONS_DEFAULT } },
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
            source: ['finance.sina.com.cn/china', 'finance.sina.com.cn/'],
            target: '/finance/china',
        },
    ],
    name: '财经－国內',
    maintainers: ['yubinbai'],
    handler,
    url: 'finance.sina.com.cn/china',
    description: renderOptionsMarkdownTable({
        parameter: 'lid',
        description: '分区 id',
        options: LID_OPTIONS,
    }),
};

async function handler(ctx) {
    const map = {
        1686: '国内滚动',
        1687: '宏观经济',
        1690: '金融新闻',
        1688: '地方经济',
        1689: '部委动态',
        3231: '今日财经 TOP10',
    };
    const pageid = '155';
    const { lid = LID_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 50);
    const response = await getRollNewsList(pageid, lid, limit);
    const list = parseRollNewsList(response.data.result.data);

    const out = await pMap(list, parseArticle, { concurrency: 3 });

    return {
        title: `新浪财经－${map[lid]}`,
        link: 'http://finance.sina.com.cn/china/',
        item: out,
    };
}
