import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: 'news', label: '全部文章' },
    { value: 'blog', label: '文章干货' },
    { value: 'articles', label: 'CRM 知识' },
    { value: 'about-influence', label: '纷享动态' },
    { value: 'customers', label: '签约喜报' },
];

const baseUrl = 'https://www.fxiaoke.com/crm';
const baseTitle = '纷享销客 CRM';
const titleMap = new Map([
    ['news', `全部文章 - ${baseTitle}`],
    ['blog', `文章干货 - ${baseTitle}`],
    ['articles', `CRM 知识 - ${baseTitle}`],
    ['about-influence', `纷享动态 - ${baseTitle}`],
    ['customers', `签约喜报 - ${baseTitle}`],
]);

export const route: Route = {
    path: '/crm/:type',
    categories: ['blog'],
    example: '/fxiaoke/crm/news',
    parameters: { type: { description: '文章类型, 见下表', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '文章',
    maintainers: ['akynazh'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '文章类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const t = ctx.req.param('type');
    const title = titleMap.get(t);
    const url = `${baseUrl}/${t}/`;
    const resp = await got(url);
    const $ = load(resp.data);
    const desc = $('.meeting').text().trim();
    let items = $('.content-item')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            const c1 = $item.find('.baike-content-t1');
            const c3 = $item.find('.baike-content-t3').find('span');
            return {
                title: c1.text().trim(),
                // pubDate: parseDate(c3.first().text().trim()),
                link: $item.find('a').attr('href'),
                author: c3.last().text().trim(),
            };
        });
    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const resp = await got(item.link);
                const $ = load(resp.data);
                const firstViewBox = $('.body-wrapper-article');

                firstViewBox.find('img').each((_, img) => {
                    const $img = $(img);
                    if ($img.attr('zoomfile')) {
                        $img.attr('src', $img.attr('zoomfile'));
                        $img.removeAttr('zoomfile');
                        $img.removeAttr('file');
                    }
                    $img.removeAttr('onmouseover');
                });

                item.description = firstViewBox.html();
                const published = $('meta[property="article:published_time"]').attr('content');
                const modified = $('meta[property="article:modified_time"]').attr('content');
                item.pubDate = published ? parseDate(published) : undefined;
                item.updated = modified ? parseDate(modified) : undefined;
                return item;
            })
        )
    );
    return {
        title: title!,
        link: url,
        description: desc,
        item: items,
    };
}
