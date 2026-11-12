import { load } from 'cheerio';
import pMap from 'p-map';

import type { Language, Route } from '@/types';
import cache from '@/utils/cache';
import { getSubPath } from '@/utils/common-utils';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CHANNEL_OPTIONS = [
    { value: '', label: '最新' },
    { value: 'kuaixun', label: '60 秒读懂世界' },
    { value: 'ziyuan', label: '精品资源' },
    { value: 'video', label: '视频资源' },
    { value: 'yinpin', label: '音频资源' },
    { value: 'jueban', label: '绝版资源' },
    { value: 'wendang', label: '实用文档' },
    { value: 'ppt-sucai', label: 'PPT 素材' },
    { value: 'sucai', label: '后期素材' },
    { value: 'jiaocheng', label: '技能教程' },
    { value: 'money', label: '创业副业' },
    { value: 'game', label: '单机游戏' },
    { value: 'mxjm', label: '冒险解谜' },
    { value: 'jingjigedou', label: '竞技格斗' },
    { value: 'saiche', label: '赛车竞技' },
    { value: 'moni', label: '模拟经营' },
    { value: 'jiaose', label: '角色扮演' },
    { value: 'feixing', label: '飞行游戏' },
    { value: 'tafang', label: '塔防策略' },
    { value: 'sheji', label: '射击游戏' },
    { value: 'kongbu', label: '恐怖冒险' },
    { value: 'celve', label: '策略生存' },
    { value: 'dongzuo', label: '动作冒险' },
    { value: 'dianshang', label: '电商运营' },
    { value: 'internet', label: '互联网早报' },
    { value: 'seo', label: '站长圈' },
    { value: 'zimeiti', label: '自媒体运营' },
    { value: 'duan-shipin', label: '短视频' },
];

export const route: Route = {
    path: '/:channel?',
    categories: ['new-media'],
    example: '/liulinblog',
    parameters: { channel: { description: '频道 id，可在对应频道页 URL 中找到，见下表，默认为最新', options: CHANNEL_OPTIONS } },
    radar: [
        {
            source: ['liulinblog.com/:channel', 'liulinblog.com/'],
            target: '/:channel',
        },
    ],
    name: '频道',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'channel',
        description: '频道 id',
        options: CHANNEL_OPTIONS,
    }),
};

export async function handler(ctx) {
    const subPath = getSubPath(ctx);
    const limit = getRouteLimit(ctx, 20);

    const rootUrl = 'https://www.liulinblog.com';
    const currentUrl = subPath === '/' ? rootUrl : `${rootUrl}${subPath}`;

    const { data: response } = await got(currentUrl);

    const $ = load(response);

    let items = $('div.scroll')
        .first()
        .find('article')
        .slice(0, limit)
        .toArray()
        .map((item) => {
            const $item = $(item);

            const a = $item.find('h2.entry-title a');
            const publishedDate = $item.find('span.meta-date time').prop('datetime');

            return {
                title: a.prop('title'),
                link: a.prop('href'),
                description: $item.find('div.entry-excerpt').html(),
                author: $item
                    .find('span.meta-author a')
                    .toArray()
                    .map((a) => $(a).prop('title'))
                    .join(' / '),
                category: $item
                    .find('span.meta-category-dot a[rel="category"]')
                    .toArray()
                    .map((c) => $(c).text()),
                guid: `liulinblog-${$item.prop('id')}`,
                pubDate: publishedDate ? parseDate(publishedDate) : undefined,
                comments: $item.find('span.meta-comment').text() ? Number($item.find('span.meta-comment').text().trim()) : 0,
            };
        });

    items = await pMap(
        items,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const { data: detailResponse } = await got(item.link);

                const content = load(detailResponse);

                content('div[role="alert"]').remove();

                item.title = content('meta[property="og:title"]').prop('content');
                item.description = content('div.entry-content').html();
                item.author = content('div.entry-meta')
                    .first()
                    .find('span.meta-author a')
                    .toArray()
                    .map((a) => content(a).prop('title'))
                    .join(' / ');
                item.category = content('div.entry-meta')
                    .first()
                    .find('span.meta-category a[rel="category"]')
                    .toArray()
                    .map((c) => content(c).text());
                item.guid = `liulinblog-${content('article').first().prop('id')}`;
                const publishedDate = content('span.meta-date time').first().prop('datetime');
                item.pubDate = publishedDate ? parseDate(publishedDate) : undefined;
                item.comments = Number(
                    content('h3.comments-title')
                        .text()
                        .match(/\((\d+)\)/)?.[1] ?? 0
                );

                return item;
            }),
        { concurrency: 3 }
    );

    const icon = $('link[rel="icon"]').prop('href');
    const title = $('img.logo').prop('alt');

    return {
        item: items,
        title: `${title} - ${subPath === '/' ? '最新' : $('h1.term-title').text().split('搜索到', 1)[0]}`,
        link: currentUrl,
        description: $('meta[name="description"]').prop('content'),
        language: 'zh-CN' as const satisfies Language,
        image: $('img.logo').prop('src'),
        icon,
        logo: icon,
        subtitle: $('p.term-description').text(),
        author: title,
    };
}
