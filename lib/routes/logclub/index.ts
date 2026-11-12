import { load } from 'cheerio';
import { getMimeType } from 'hono/utils/mime';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import { getSubPath } from '@/utils/common-utils';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { renderDescription } from './templates/description';

const ID_OPTIONS = [
    { value: '10-16', label: '供应链' },
    { value: '11', label: '快递' },
    { value: '30', label: '快运 / 运输' },
    { value: '9', label: '仓储 / 地产' },
    { value: '32', label: '物流综合' },
    { value: '114', label: '国际与跨境物流' },
    { value: '107', label: '科技创新' },
    { value: '213', label: '绿色供应链' },
    { value: '214', label: '低碳物流' },
    { value: '215', label: '碳中和碳达峰' },
];

export const route: Route = {
    path: '/news/:id?',
    categories: ['new-media'],
    example: '/logclub/news',
    parameters: { id: { description: '资讯 id，见下表，可在对应资讯页 URL 中找到，默认为全部', options: ID_OPTIONS } },
    radar: [
        {
            source: ['logclub.com/news'],
            target: '/news',
        },
        {
            source: ['logclub.com/news/:id'],
            target: '/news/:id',
        },
    ],
    name: '资讯',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '资讯 id',
        options: ID_OPTIONS,
    }),
};

export async function handler(ctx) {
    const limit = getRouteLimit(ctx, 11);

    const rootUrl = 'https://www.logclub.com';
    const currentUrl = new URL(getSubPath(ctx), rootUrl).href;

    const { data: response } = await got(currentUrl);

    const $ = load(response);

    let items = $('li.layui-row, li.layui-timeline-item')
        .slice(0, limit)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            const a = $item.find('div.newslist-txt h3 a, a.article_title').first();
            const image = $item.find('img.img-hover').prop('src')?.split(/\?/, 1)[0] ?? undefined;

            return {
                title: a.text(),
                link: new URL(a.prop('href')!, rootUrl).href,
                description: renderDescription({
                    image: {
                        src: image,
                        alt: a.text(),
                    },
                    intro: $item.find('p.newslist-intro, div.newslist-info-intro').text(),
                }),
                itunes_item_image: image,
            };
        });

    items = await pMap(
        items,
        async (item) => {
            const detailResponse = await cache.tryGet(`logclub:html:${item.link}`, async () => {
                const { data } = await got(item.link);
                return data;
            });

            const content = load(detailResponse);

            content('a.dl_file').each((_, el) => {
                const $el = content(el);
                $el.parent().remove();
            });
            content('img').each((_, el) => {
                const $el = content(el);
                $el.replaceWith(
                    renderDescription({
                        image: {
                            src: $el.prop('src')?.split(/\?/, 1)[0] ?? undefined,
                            alt: $el.prop('title'),
                        },
                    })
                );
            });

            item.title = content('h1, div.current_video_title').first().text();

            item.enclosure_url = content('video#ref_video').prop('src');
            item.enclosure_type = item.enclosure_url ? getMimeType(new URL(item.enclosure_url, item.link).pathname) : undefined;

            item.description += renderDescription({
                video: {
                    poster: item.itunes_item_image,
                    src: item.enclosure_url,
                    type: item.enclosure_type,
                },
                description: content('div.article-cont').html() ?? undefined,
            });
            item.author = content('div.article-info-r a')
                .toArray()
                .map((a) => content(a).text())
                .join('/');
            item.category = [
                ...new Set([
                    ...content('div.article-label-r a.label')
                        .toArray()
                        .map((c) => content(c).text()),
                    ...(content('meta[name="keywords"]')
                        .prop('content')
                        ?.split(/\s?,\s?/) ?? []),
                ]),
            ].filter(Boolean);

            item.pubDate =
                content('span.aritlceIn-time').length === 0
                    ? parseDate(
                          content(
                              content('div.video_info_item, div.lc-infos div')
                                  .toArray()
                                  .findLast((i) => /\d{4}-\d{2}-\d{2}/.test(content(i).text()))
                          )
                              .text()
                              .split(/：/)
                              .pop()!
                              .trim()
                      )
                    : parseDate(content('span.aritlceIn-time').text().trim());

            return item;
        },
        { concurrency: 3 }
    );

    const icon = new URL($('link[rel="shortcut icon"]').prop('href')!, rootUrl).href;
    const subtitle = $('meta[name="keywords"]').prop('content');
    const author = subtitle.split(/,/, 1)[0];

    return {
        item: items,
        title: $('title').text().split(/-/, 1)[0].trim(),
        link: currentUrl,
        description: $('meta[name="description"]').prop('content'),
        language: 'zh' as const,
        image: new URL($('div.logo_img img').prop('src')!, rootUrl).href,
        icon,
        logo: icon,
        subtitle: subtitle.replaceAll(',', ''),
        author,
        itunes_author: author,
        itunes_category: 'News',
    };
}
