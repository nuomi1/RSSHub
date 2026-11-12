import { load } from 'cheerio';
import { FetchError } from 'ofetch';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: '0', label: '全部通知' },
    { value: '1', label: '招生信息' },
    { value: '2', label: '教务管理' },
    { value: '3', label: '论文管理' },
    { value: '4', label: '思政工作' },
    { value: '5', label: '评奖评优' },
    { value: '6', label: '实习就业' },
    { value: '7', label: '国际实习' },
    { value: '8', label: '国内合作科研' },
    { value: '9', label: '国际合作科研' },
    { value: '10', label: '校园服务' },
];

const host = 'http://www.cst.zju.edu.cn/';

class ArticleUnavailableError extends Error {}

const map = new Map([
    [0, { id: '', title: '浙大软件学院-全部通知' }],
    [1, { id: '32178/list.htm', title: '浙大软件学院-招生信息' }],
    [2, { id: '36216/list.htm', title: '浙大软件学院-教务管理' }],
    [3, { id: '36217/list.htm', title: '浙大软件学院-论文管理' }],
    [4, { id: '36224/list.htm', title: '浙大软件学院-思政工作' }],
    [5, { id: '36228/list.htm', title: '浙大软件学院-评奖评优' }],
    [6, { id: '36233/list.htm', title: '浙大软件学院-实习就业' }],
    [7, { id: '36235/list.htm', title: '浙大软件学院-国际实习' }],
    [8, { id: '36194/list.htm', title: '浙大软件学院-国内合作科研' }],
    [9, { id: '36246/list.htm', title: '浙大软件学院-国际合作科研' }],
    [10, { id: '36195/list.htm', title: '浙大软件学院-校园服务' }],
]);

async function getPage(id) {
    const res = await got({
        method: 'get',
        url: host + id,
    });

    const $ = load(res.data);
    const list = $('.lm_new').find('li');

    return list.toArray().map((item) => {
        const $item = $(item);
        return {
            title: $item.find('a').text(),
            pubDate: parseDate($item.find('.fr').text()),
            link: new URL($item.find('a').attr('href')!, host).href,
        };
    });
}

export const route: Route = {
    path: '/cst/:type',
    categories: ['university'],
    example: '/zju/cst/0',
    parameters: { type: { description: '分类，见下表', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '软件学院',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类',
        options: TYPE_OPTIONS,
    }),
    maintainers: ['yonvenne', 'zwithz'],
    handler,
};

async function handler(ctx) {
    const type = Number.parseInt(ctx.req.param('type'));
    const link = host + map.get(type)!.id;
    let items: any[] = [];
    if (type === 0) {
        const results = await pMap(map.values(), (value) => getPage(value.id), { concurrency: 3 });
        items = results.flat();
    } else {
        items = await getPage(map.get(type)!.id);
    }

    const out = await pMap(
        items,
        async (item) => {
            try {
                const description = await cache.tryGet(`zju:cst:details:v2:${item.link}`, async () => {
                    const response = await got({
                        method: 'get',
                        url: item.link,
                        headers: {
                            Referer: link,
                        },
                    });
                    const $ = load(response.data);
                    const description = $(new URL(item.link).hostname === 'www.idi.zju.edu.cn' ? 'article.article-content' : '.vid_wz').html();
                    if (!description) {
                        throw new ArticleUnavailableError('Article content is unavailable at this source page.');
                    }
                    return description;
                });
                return { ...item, description };
            } catch (error) {
                if (!(error instanceof ArticleUnavailableError || error instanceof FetchError)) {
                    throw error;
                }
                return item;
            }
        },
        { concurrency: 3 }
    );

    return {
        title: map.get(type)!.title,
        link,
        item: out,
    };
}
