import { load } from 'cheerio';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { parseSourceDate } from './utils';

const TYPE_OPTIONS = [
    { value: '24h', label: '24 小时阅读榜' },
    { value: '7days', label: '7 天最热' },
    { value: '月榜', label: 'monthly' },
];

export const route: Route = {
    path: '/ranking/:type',
    categories: ['new-media'],
    example: '/ithome/ranking/24h',
    parameters: { type: { description: '类别', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '热榜',
    maintainers: ['immmortal', 'luyuhuang'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类别',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const option = ctx.req.param('type');
    const config = {
        '24h': '24 小时最热',
        '7days': '7 天最热',
        monthly: '月榜',
    };

    const type2id = {
        '24h': 'd-1',
        '7days': 'd-2',
        monthly: 'd-3',
    };

    if (!Object.hasOwn(type2id, option)) {
        throw new InvalidParameterError('Bad type. See <a href="https://docs.rsshub.app/routes/new-media#it-zhi-jia">https://docs.rsshub.app/routes/new-media#it-zhi-jia</a>');
    }
    const title = config[option];
    const id = type2id[option];

    const response = await got({
        method: 'get',
        url: 'https://www.ithome.com/block/rank.html',
    });
    const $ = load(response.data);

    const list = $(`#${id} > li`)
        .toArray()
        .map((item) => {
            const info: DataItem = {
                title: $(item).find('a').text(),
                link: $(item).find('a').attr('href'),
            };
            return info;
        });

    const items = await pMap(
        list,
        async (item) => {
            const details = await cache.tryGet(`ithome:article:${item.link}`, async () => {
                const res = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(res.data);
                const paragraph = content('#paragraph');
                paragraph.find('img[data-original]').each((_, ele) => {
                    const $ele = $(ele);
                    $ele.attr('src', $ele.attr('data-original'));
                    $ele.removeAttr('class');
                    $ele.removeAttr('data-original');
                });
                return { description: paragraph.html(), pubDate: parseSourceDate(content('#pubtime_baidu').text()) };
            });
            return { ...item, ...details };
        },
        { concurrency: 3 }
    );

    return {
        title: `IT之家-${title}`,
        link: 'https://www.ithome.com',
        item: items,
    };
}
