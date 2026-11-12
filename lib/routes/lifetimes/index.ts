import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'news', label: '新闻' },
    { value: 'medicine', label: '医药' },
    { value: 'healthpromotion', label: '养生' },
    { value: 'life', label: '生活' },
    { value: 'mothers', label: '母亲行动' },
    { value: 'longevity', label: '长寿' },
    { value: 'video', label: '视频' },
    { value: 'news-comment', label: '时评' },
    { value: 'hotspot', label: '调查' },
    { value: 'industry', label: '产业经济' },
];
const CATEGORY_OPTIONS_DEFAULT = 'news';

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/lifetimes',
    parameters: { category: { description: '栏目，见下表，默认为新闻', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '栏目',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '栏目',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

const nodes = {
    hotspot: { title: '调查', node: '%22/eh78c0d1d%22' },
    industry: { title: '产业经济', node: '%22/ehg62mqqm%22' },
    'news-comment': { title: '本报时评', node: '%22/egv8vnjpq/egv8vtbcl%22' },
};

async function handler(ctx: Context) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://www.lifetimes.cn';
    const currentUrl = `${rootUrl}/${category.replace('-', '/')}`;

    let title;
    let list: Array<{ link: string }>;

    const apiNode = nodes[category];
    if (apiNode) {
        title = apiNode.title;
        const response = await ofetch(`${rootUrl}/api/list?offset=0&limit=20&node=${apiNode.node}`, {
            parseResponse: JSON.parse,
        });
        list = response.list.slice(0, 20).map((item) => ({
            link: `${rootUrl}/article/${item.aid}`,
        }));
    } else {
        const response = await ofetch(currentUrl);
        const $ = load(response);

        title = $('title').text();

        $('.oPBlock').remove();

        list = $('.list-block ul li, .firstCon-r ul li')
            .find('a')
            .slice(0, 10)
            .toArray()
            .map((item) => ({
                link: `https:${$(item).attr('href')}`,
            }));
    }

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await ofetch(item.link);
                const content = load(detailResponse);

                const pubDate = detailResponse.match(/\\"ctime\\":(\d+)/)?.[1];
                const updated = detailResponse.match(/\\"utime\\":(\d+)/)?.[1];

                return {
                    ...item,
                    description: content('article').html(),
                    title: content('.container-title').text(),
                    author: content('.source').text().replace('来源：', ''),
                    pubDate: pubDate ? parseDate(Number(pubDate)) : undefined,
                    updated: updated ? parseDate(Number(updated)) : undefined,
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: `${title} - 生命时报`,
        link: currentUrl,
        item: items,
    };
}
