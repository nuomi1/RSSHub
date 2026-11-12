import pMap from 'p-map';

// Warning: The author still knows nothing about javascript!
import type { Route } from '@/types';
import cache from '@/utils/cache';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getArticle, getNotifByPage } from './_utils';

const TYPE_OPTIONS = [
    { value: 'notice', label: '学院通知' },
    { value: 'enrollment', label: '招生通知' },
    { value: 'academic-paper', label: '学术观点' },
    { value: 'news', label: '新闻' },
    { value: 'events', label: '活动' },
    { value: 'focus', label: '视点' },
    { value: 'collegerecruitment', label: '教师与行政人员招聘' },
];
const TYPE_OPTIONS_DEFAULT = 'notice';

export const route: Route = {
    path: '/sem/:type?',
    categories: ['university'],
    example: '/tongji/sem/notice',
    parameters: { type: { description: '通知类型，默认为 `notice`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '经济与管理学院通知',
    maintainers: ['sitdownkevin'],
    url: 'sem.tongji.edu.cn/semch',
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '通知类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') || TYPE_OPTIONS_DEFAULT;
    const subtype = new Set(['enrollment', 'academic-paper', 'news', 'events', 'focus', 'collegerecruitment']);
    const subtypeName = {
        notice: '学院通知',
        enrollment: '招生通知',
        'academic-paper': '学术观点',
        news: '新闻',
        events: '活动',
        focus: '视点',
        collegerecruitment: '教师与行政人员招聘',
    };

    const url = `https://sem.tongji.edu.cn/semch/category/frontpage/${subtype.has(type) ? type : 'notice'}`;

    const results: Array<{ title: string; link: string; pubDate: Date }> = await getNotifByPage(url);

    const resultsWithContent = await pMap(results, async (item) => ({ ...item, ...(await cache.tryGet(`tongji:sem:article:${item.link}`, () => getArticle(item.link))) }), { concurrency: 3 });

    // feed the data to rss
    return {
        title: '同济大学经济与管理学院',
        description: String(subtype.has(type) ? subtypeName[type] : '学院通知'),
        image: 'https://upload.wikimedia.org/wikipedia/zh/f/f8/Tongji_University_Emblem.svg',
        icon: 'https://upload.wikimedia.org/wikipedia/zh/f/f8/Tongji_University_Emblem.svg',
        logo: 'https://upload.wikimedia.org/wikipedia/zh/f/f8/Tongji_University_Emblem.svg',
        link: 'https://sem.tongji.edu.cn/semch',
        item: resultsWithContent,
    };
}
