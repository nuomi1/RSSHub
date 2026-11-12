import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import { getContent } from './utils';

const TYPE_OPTIONS = [
    { value: 'sytzgg_4568', label: '首页通知公告' },
    { value: 'sytzgg', label: '首页新闻动态' },
    { value: '14686', label: '最新通知' },
    { value: '14687', label: '招生信息' },
    { value: '14688', label: '培养信息' },
    { value: 'xshdggl', label: '学术活动' },
];
const TYPE_OPTIONS_DEFAULT = 'sytzgg_4568';

const host = 'https://gs.njust.edu.cn';

export const route: Route = {
    path: '/gs/:type?',
    categories: ['university'],
    example: '/njust/gs/sytzgg_4568',
    parameters: { type: { description: '分类 ID，部分示例参数见下表，默认为首页通知公告，其他分类 ID 可以从网站 URL Path 中找到，如国际交流为 `gjjl`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
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
            source: ['gs.njust.edu.cn/:type/list.htm'],
            target: '/gs/:type',
        },
    ],
    name: '研究生院',
    maintainers: ['MilkShakeYoung', 'jasongzy'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分类 ID',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    const id = '/' + type;
    const siteUrl = host + id + '/list.htm';

    const html = await getContent(siteUrl);
    const $ = load(html);
    const title = '南京理工大学研究生院 -- ' + $('title').text();
    const list = $('ul.news_ul').find('li');

    const items = await pMap(
        list.toArray(),
        async (item) => {
            const url = $(item).find('a').attr('href');
            let desc = '';
            if (url!.startsWith('/')) {
                desc = await cache.tryGet(host + url, async () => {
                    const data = await getContent(host + url);
                    return load(data)('.wp_articlecontent').html() ?? '';
                });
            }

            return {
                title: $(item).find('a').attr('title') || $(item).find('a').text(),
                description: desc,
                pubDate: timezone(parseDate($(item).find('span').text(), 'YYYY-MM-DD'), 8),
                link: url,
            };
        },
        { concurrency: 6 }
    );

    return {
        title,
        link: siteUrl,
        item: items,
    };
}
