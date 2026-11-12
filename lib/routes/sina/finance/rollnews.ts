import pMap from 'p-map';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getRollNewsList, parseArticle, parseRollNewsList } from '../utils';

const LID_OPTIONS = [
    { value: '2519', label: '财经' },
    { value: '2671', label: '股市' },
    { value: '2672', label: '美股' },
    { value: '2673', label: '中国概念股' },
    { value: '2674', label: '港股' },
    { value: '2675', label: '研究报告' },
    { value: '2676', label: '全球市场' },
    { value: '2487', label: '外汇' },
];
const LID_OPTIONS_DEFAULT = '2519';

export const route: Route = {
    path: '/finance/rollnews/:lid?',
    categories: ['new-media'],
    example: '/sina/finance/rollnews',
    parameters: { lid: { description: '分区 id，见下表，默认为 `2519`', options: LID_OPTIONS, default: LID_OPTIONS_DEFAULT } },
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
            source: ['finance.sina.com.cn/roll', 'finance.sina.com.cn/'],
            target: '/finance/rollnews',
        },
    ],
    name: '财经－滚动新闻',
    maintainers: ['betterandbetterii'],
    handler,
    url: 'finance.sina.com.cn/roll',
    description: renderOptionsMarkdownTable({
        parameter: 'lid',
        description: '分区 id',
        options: LID_OPTIONS,
    }),
};

async function handler(ctx) {
    const map = {
        2519: '财经',
        2671: '股市',
        2672: '美股',
        2673: '中国概念股',
        2674: '港股',
        2675: '研究报告',
        2676: '全球市场',
        2487: '外汇',
    };

    const pageid = '384';
    const { lid = LID_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 50);
    const response = await getRollNewsList(pageid, lid, limit);
    const list = parseRollNewsList(response.data.result.data);

    const out = await pMap(list, parseArticle, { concurrency: 3 });

    return {
        title: `新浪财经－${map[lid] ?? lid}滚动新闻`,
        link: `https://finance.sina.com.cn/roll/#pageid=${pageid}&lid=${lid}&k=&num=${limit}&page=1`,
        item: out,
    };
}
