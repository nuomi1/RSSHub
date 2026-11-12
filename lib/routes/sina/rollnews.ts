import pMap from 'p-map';

import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { getRollNewsList, parseArticle, parseRollNewsList } from './utils';

const LID_OPTIONS = [
    { value: '2509', label: '全部' },
    { value: '2510', label: '国内' },
    { value: '2511', label: '国际' },
    { value: '2669', label: '社会' },
    { value: '2512', label: '体育' },
    { value: '2513', label: '娱乐' },
    { value: '2514', label: '军事' },
    { value: '2515', label: '科技' },
    { value: '2516', label: '财经' },
    { value: '2517', label: '股市' },
    { value: '2518', label: '美股' },
];
const LID_OPTIONS_DEFAULT = '2509';

export const route: Route = {
    path: '/rollnews/:lid?',
    categories: ['new-media'],
    example: '/sina/rollnews',
    parameters: { lid: { description: '分区 id，可在 URL 中找到，默认为 `2509`', options: LID_OPTIONS, default: LID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '滚动新闻',
    maintainers: ['xyqfer'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'lid',
        description: '分区 id',
        options: LID_OPTIONS,
    }),
};

async function handler(ctx) {
    const map = {
        2509: '全部',
        2510: '国内',
        2511: '国际',
        2669: '社会',
        2512: '体育',
        2513: '娱乐',
        2514: '军事',
        2515: '科技',
        2516: '财经',
        2517: '股市',
        2518: '美股',
    };

    const pageid = '153';
    const { lid = LID_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 50);
    const response = await getRollNewsList(pageid, lid, limit);
    const list = parseRollNewsList(response.data.result.data);

    const out = await pMap(list, parseArticle, { concurrency: 3 });

    return {
        title: `新浪${map[lid]}滚动新闻`,
        link: `https://news.sina.com.cn/roll/#pageid=${pageid}&lid=${lid}&k=&num=${limit}&page=1`,
        item: out,
    };
}
