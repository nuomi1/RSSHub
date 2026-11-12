import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

import { getFullText } from './utils';

const ID_OPTIONS = [
    { value: 'headlines', label: '聚焦' },
    { value: 'aall', label: '即時' },
    { value: 'aipl', label: '政治' },
    { value: 'aopl', label: '國際' },
    { value: 'acn', label: '兩岸' },
    { value: 'aie', label: '產經' },
    { value: 'asc', label: '證券' },
    { value: 'ait', label: '科技' },
    { value: 'ahel', label: '生活' },
    { value: 'asoc', label: '社會' },
    { value: 'aloc', label: '地方' },
    { value: 'acul', label: '文化' },
    { value: 'aspt', label: '運動' },
    { value: 'amov', label: '娛樂' },
];
const ID_OPTIONS_DEFAULT = 'aall';

export const route: Route = {
    path: '/:id?',
    categories: ['traditional-media'],
    example: '/cna/aall',
    parameters: { id: { description: '分类 id 或新闻专题 id。分类 id 见下表，新闻专题 id 為 https://www.cna.com.tw/list/newstopic.aspx 中，連結的數字部份。此參數默认为 aall', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '编号',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') || ID_OPTIONS_DEFAULT;
    const isTopic = /^\d+$/.test(id);
    const limit = getRouteLimit(ctx, 20);

    // The API used by the website when hitting "看更多內容"
    const { data: response } = await got({
        method: 'post',
        url: `https://www.cna.com.tw/cna2018api/api/${isTopic ? 'WTopic' : 'WNewsList'}`,
        json: {
            action: '0',
            category: isTopic ? 'newstopic' : id,
            tno: isTopic ? id : undefined,
            pagesize: limit,
            pageidx: 1,
        },
    });

    const {
        ResultData: { MetaData: metadata },
        ResultData: resultData,
    } = response;
    const list = (isTopic ? resultData.Topic.NewsItems : resultData.Items).slice(0, limit).map((item) => ({
        title: item.HeadLine,
        link: item.PageUrl,
        pubDate: timezone(parseDate(item.CreateTime), 8),
    }));

    const items = await Promise.all(list.map((item) => cache.tryGet(item.link, async () => await getFullText(item))));

    return {
        title: metadata.Title,
        description: metadata.Description,
        link: metadata.CanonicalUrl,
        image: metadata.Image,
        item: items,
    };
}
