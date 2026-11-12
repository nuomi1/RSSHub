import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'xstd', label: '学生活动' },
    { value: 'jsfc', label: '教师风采' },
    { value: 'xwdt', label: '新闻动态' },
];
const CATEGORY_OPTIONS_DEFAULT = 'tzgg';

/*
 * Dictionary of supported text-based categories.
 * Other sections (such as video news) are intentionally excluded as they require complex media parsing.
 */
const categoryMap = new Map([
    ['tzgg', '通知公告'],
    ['xstd', '学生活动'],
    ['jsfc', '教师风采'],
    ['xwdt', '新闻动态'],
]);

async function fetchArticleDetails(link: string): Promise<Pick<DataItem, 'description'>> {
    if (new URL(link).hostname !== 'www.qhfz.edu.cn') {
        return {};
    }
    const response = await ofetch(link);
    const $ = load(response);

    return { description: $('.v_news_content').html() || '' };
}

export const route: Route = {
    path: '/thuhs/:category?',
    categories: ['university'],
    example: '/tsinghua/thuhs/tzgg',
    parameters: { category: { description: '分类，见下表，留空则默认获取通知公告', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['www.qhfz.edu.cn/tzgg.htm'],
            target: '/thuhs/tzgg',
        },
        {
            source: ['www.qhfz.edu.cn/xstd.htm'],
            target: '/thuhs/xstd',
        },
        {
            source: ['www.qhfz.edu.cn/jsfc.htm'],
            target: '/thuhs/jsfc',
        },
        {
            source: ['www.qhfz.edu.cn/xwdt.htm'],
            target: '/thuhs/xwdt',
        },
    ],
    name: '附属中学',
    maintainers: ['Aquarius-Situla'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx: Context) {
    /* Determine the target URL based on the provided category */
    const category = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;
    const host = 'https://www.qhfz.edu.cn';
    const targetUrl = `${host}/${category}.htm`;

    const response = await ofetch(targetUrl);
    const $ = load(response);

    /* Locate the list of articles on the specific category page */
    const list = $('.list ul li, .list_tt ul li');

    /* Extract metadata (title, link, date) for each article */
    const items = list
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);
            const $a = $item.find('a');
            const title = $a.attr('title') || $a.text();
            const time = $item.find('.sj').text();
            const link = $a.attr('href');

            return {
                title,
                link: link ? new URL(link, targetUrl).href : '',
                pubDate: time ? timezone(parseDate(time, 'YYYY-MM-DD'), 8) : undefined,
            };
        })
        .filter((item) => item.link); // Filter out empty links

    const feedTitle = categoryMap.get(category) || '通知公告';

    /* Fetch full article content using the RSSHub cache mechanism */
    const out = await pMap(
        items,
        async (item) => {
            const details = await cache.tryGet(item.link, () => fetchArticleDetails(item.link));
            return { ...item, description: details.description };
        },
        { concurrency: 3, stopOnError: false }
    );

    const icon = new URL('images/logo.png', host).href;

    return {
        title: `清华附中 - ${feedTitle}`,
        link: targetUrl,
        item: out,
        image: icon,
        icon,
        logo: icon,
    };
}
