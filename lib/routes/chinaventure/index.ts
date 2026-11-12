import { load } from 'cheerio';

import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '', label: '推荐' },
    { value: '78', label: '商业深度' },
    { value: '80', label: '资本市场' },
    { value: '83', label: '5G' },
    { value: '111', label: '健康' },
    { value: '110', label: '教育' },
    { value: '112', label: '地产' },
    { value: '113', label: '金融' },
    { value: '114', label: '硬科技' },
    { value: '116', label: '新消费' },
];

const rootUrl = 'https://www.chinaventure.com.cn';

const nodes = {
    78: '商业深度',
    80: '资本市场',
    83: '5G',
    111: '健康',
    110: '教育',
    112: '地产',
    113: '金融',
    114: '硬科技',
    116: '新消费',
};

export const route: Route = {
    path: '/news/:id?',
    categories: ['new-media'],
    example: '/chinaventure/news/78',
    parameters: { id: { description: '分类，见下表，默认为推荐', options: ID_OPTIONS } },
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
            source: ['chinaventure.com.cn/'],
            target: '',
        },
    ],
    name: '分类',
    maintainers: ['yuxinliu-alex'],
    handler,
    url: 'www.chinaventure.com.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const currentUrl = rootUrl.concat(id ? `/news/${id}.html` : '/index.html');

    const response = await got({
        method: 'get',
        url: currentUrl,
    });
    const $ = load(response.data);
    const limit = getRouteLimit(ctx, 20);
    const list = $('a', '.common_newslist_pc')
        .filter((_, element) => !!$(element).attr('href'))
        .toArray()
        .map((item): DataItem => ({
            link: rootUrl + $(item).attr('href'),
            title: '',
        }))
        .slice(0, limit);

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = load(detailResponse.data);
                item.title = content('h1.maintitle_pc').text();
                item.description = content('div.article_slice_pc').html();
                item.author = content('div.source_author').text();
                item.pubDate = timezone(parseDate(content('div.releaseTime').text()), 8);
                return item;
            })
        )
    );

    return {
        title: `${nodes[id] ?? '推荐'}-投中网`,
        link: currentUrl,
        description: '投中网是国内领先的创新经济信息服务平台，拥有立体化媒体矩阵，十多年行业深耕，为创新经济领域核心人群提供深入、独到的智识和洞见，在私募股权投资行业和创新商业领域均拥有权威影响力。',
        language: 'zh-CN' as const satisfies Language,
        item: items,
    };
}
