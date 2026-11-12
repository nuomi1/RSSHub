import { load } from 'cheerio';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const ID_OPTIONS = [
    { value: 'zjrb', label: '浙江日报' },
    { value: 'qjwb', label: '钱江晚报' },
    { value: 'msb', label: '美术报' },
    { value: 'zjlnb', label: '浙江老年报' },
    { value: 'zjfzb', label: '浙江法制报' },
    { value: 'jnyb', label: '江南游报' },
];
const ID_OPTIONS_DEFAULT = 'zjrb';

export const route: Route = {
    path: '/paper/:id?',
    categories: ['traditional-media'],
    example: '/zjol/paper/zjrb',
    parameters: { id: { description: '报纸 id，见下表，默认为 `zjrb`，即浙江日报', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '浙报集团系列报刊',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '报纸 id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;
    const limit = getRouteLimit(ctx, 100);

    const allowedId = ['zjrb', 'qjwb', 'msb', 'zjlnb', 'zjfzb', 'jnyb'];
    if (!allowedId.includes(id)) {
        throw new InvalidParameterError('id not allowed');
    }

    const query = id === 'jnyb' ? 'map[name="PagePicMap"] area' : 'ul.main-ed-articlenav-list li a';

    const rootUrl = id === 'qjwb' ? 'http://qjwb.thehour.cn' : `https://${id}.zjol.com.cn`;
    let currentUrl = `${rootUrl}/paperindex.htm`;

    let response = await got({
        method: 'get',
        url: currentUrl,
    });

    const url = response.data.match(/URL=(.*)"/)[1];
    const pubDate = parseDate(url.match(/(\d{4}-\d{2}\/\d{2})/)[1], 'YYYY-MM/DD');

    currentUrl = `${rootUrl}/${url.replace(`/${url.split('/').pop()}`, '')}`;

    response = await got({
        method: 'get',
        url: `${rootUrl}/${url}`,
    });

    const $ = load(response.data);

    const links: string[] = $(query)
        .toArray()
        .map((a) => `${currentUrl}/${$(a).attr('href')}`);

    const sections = await pMap(
        $('#pageLink')
            .slice(1)
            .toArray()
            .map((p) => `${currentUrl}/${$(p).attr('href')}`),
        async (p) => {
            const pageResponse = await got({
                method: 'get',
                url: p,
            });

            const page = load(pageResponse.data);

            return page(query)
                .toArray()
                .map((a) => `${currentUrl}/${page(a).attr('href')}`);
        },
        { concurrency: 3 }
    );
    links.push(...sections.flat());

    const items = await pMap(
        links.filter((a) => (id === 'jnyb' ? a.endsWith('?div=1') : true)).slice(0, limit),
        (link) =>
            cache.tryGet(link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: link,
                });

                const content = load(detailResponse.data);

                const title = content('.main-article-title').text();
                const author = content('.main-article-author').text().trim() || undefined;

                content('.main-article-alltitle').remove();

                return {
                    title,
                    author,
                    pubDate,
                    link: link.split('?', 1)[0],
                    description: content('.main-article-content').html(),
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: rootUrl,
        item: items,
    };
}
