import { load } from 'cheerio';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';
import { finishArticleItem } from '@/utils/wechat-mp';

const TYPE_OPTIONS = [
    { value: 'notice', label: '通知公告' },
    { value: 'news', label: '教务快讯' },
];
const TYPE_OPTIONS_DEFAULT = 'notice';

const host = 'https://jwc.njupt.edu.cn';

const map = {
    notice: '/1594',
    news: '/1596',
};

export const route: Route = {
    path: '/jwc/:type?',
    categories: ['university'],
    example: '/njupt/jwc/notice',
    parameters: { type: { description: '默认为 `notice`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处通知与新闻',
    maintainers: ['shaoye'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError('Unsupported type. Use notice or news.');
    }
    const link = host + map[type] + '/list.htm';
    const response = await got({
        method: 'get',
        url: link,
    });
    const $ = load(response.data);

    const list = $('.news_list li')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);

            return {
                title: $item.find('.news_title').text(),
                link: new URL($item.find('a').attr('href')!, host).href,
                pubDate: timezone(parseDate($item.find('.news_meta').text()), 8),
            };
        });

    const items = await pMap(
        list,
        (item) => {
            if (new URL(item.link!).host === 'mp.weixin.qq.com') {
                return finishArticleItem({ ...item, guid: item.link });
            }

            return cache.tryGet(item.link!, async () => {
                const detailResponse = await got(item.link);
                const $ = load(detailResponse.data);
                item.description = $('.wp_articlecontent').html() ?? '该通知无法直接预览，请点击原文链接查看';
                return item;
            });
        },
        { concurrency: 6 }
    );

    return {
        title: `南京邮电大学 -- ${type === 'news' ? '教务快讯' : '通知公告'}`,
        link,
        item: items,
    };
}
