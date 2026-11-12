import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { parseDateText } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'Actions', label: '动作' },
    { value: 'SubPrograms', label: '子程序' },
    { value: 'ActionLists', label: '动作单' },
];

export const route: Route = {
    path: '/user/:category/:id',
    categories: ['programming'],
    example: '/quicker/user/Actions/3-CL',
    parameters: { category: { description: '分类，见下表', options: CATEGORY_OPTIONS }, id: '用户 id，可在对应用户页 URL 中找到' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '用户更新',
    maintainers: ['Cesaryuan', 'nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const requestedLimit = Number(ctx.req.query('limit'));
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 25;
    const category = ctx.req.param('category');
    const id = ctx.req.param('id');

    const rootUrl = 'https://getquicker.net';
    const currentUrl = `${rootUrl}/User/${category}/${id}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('table tbody tr')
        .toArray()
        .flatMap((item): Array<DataItem & { link: string }> => {
            const $item = $(item).find('td a').first();
            const href = $item.attr('href');
            if (!href) {
                return [];
            }
            return [{ title: $item.text(), link: new URL(href, rootUrl).href, pubDate: parseDateText($(item).find('[title="最后更新"]').text()) }];
        })
        .slice(0, limit);

    items = await pMap(
        items,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                content('section').last().remove();
                content('#app').children().slice(0, 2).remove();

                const dateElement = content('.text-secondary a[title], .text-secondary span[title]')
                    .filter((_, element) => /\d{4}[-/]/.test(content(element).attr('title') ?? ''))
                    .first();
                const pubDate = dateElement.attr('title') || content('.text-secondary a').not('.text-secondary').first().text() || content('div.note-text').find('span').eq(3).text();

                item.author = content('.user-link').first().text();
                item.description = content('div[data-info="动作信息"]').html() ?? content('#app').html() ?? content('.row').eq(1).html();
                item.pubDate = parseDateText(pubDate) ?? item.pubDate;

                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
}
