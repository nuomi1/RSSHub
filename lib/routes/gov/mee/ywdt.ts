import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'szyw', label: '时政要闻' },
    { value: 'hjywnews', label: '环境要闻' },
    { value: 'dfnews', label: '地方快讯' },
    { value: 'xwfb', label: '新闻发布' },
    { value: 'spxw', label: '视频新闻' },
    { value: 'gsgg', label: '公示公告' },
];
const CATEGORY_OPTIONS_DEFAULT = 'szyw';

const baseUrl = 'https://www.mee.gov.cn/';
const columns = {
    szyw: { name: '时政要闻', order: 1 },
    hjywnews: { name: '环境要闻', order: 2 },
    dfnews: { name: '地方快讯', order: 3 },
    xwfb: { name: '新闻发布', order: 4 },
    spxw: { name: '视频新闻', order: 5 },
    gsgg: { name: '公示公告', order: 6 },
};

export const route: Route = {
    path: '/ywdt/:category?',
    categories: ['government'],
    example: '/gov/mee/ywdt/hjywnews',
    parameters: { category: { description: '分类名，预设 `szyw`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['www.mee.gov.cn/ywdt/:category'],
            target: '/ywdt/:category',
        },
    ],
    name: '要闻动态',
    maintainers: ['liuxsdev'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const cate = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    const url = `${baseUrl}ywdt/`;
    const title = `${columns[cate].name} - 要闻动态 - 中华人民共和国生态环境部`;
    const response = await got(url);
    const $ = load(response.data);
    const all = $('.bd');
    const list = all
        .find(`div:nth-child(${columns[cate].order})`)
        .find('.mobile_none li , .mobile_clear li')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const title = $(item).find('a.cjcx_biaob').text();
            const href = $(item).find('a').attr('href');

            let absolutePath;
            if (href!.search(String.raw`\./`) === 0) {
                absolutePath = `${url}${href!.slice(2)}`;
            } else if (href!.search(String.raw`\./`) === 1) {
                absolutePath = `${baseUrl}${href!.slice(3)}`;
            } else {
                absolutePath = href;
            }
            const link = absolutePath;
            return {
                title,
                link,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got(item.link);
                const content = load(detailResponse.data);
                try {
                    const pubDate = content('meta[name=PubDate]').attr('content');
                    item.pubDate = pubDate ? timezone(parseDate(pubDate), 8) : undefined;
                    // Video news uses a separate article layout.
                    if (cate === 'spxw') {
                        item.title = content('meta[name=ArticleTitle]').attr('content')!;
                        // Disable automatic video playback.
                        const videoControl = content('.neiright_JPZ_GK_CP video');
                        videoControl.removeAttr('autoplay');
                        // Resolve the native video source URL.
                        const videoSource = content('.neiright_JPZ_GK_CP source');
                        const videoHref = videoSource.attr('src');
                        if (videoHref) {
                            videoSource.attr('src', new URL(videoHref, item.link).href);
                        }
                    }
                    item.description = content('.neiright_JPZ_GK_CP').html();
                } catch {
                    item.description = '';
                }
                return item;
            })
        )
    );

    return {
        title,
        link: url,
        item: items,
    };
}
