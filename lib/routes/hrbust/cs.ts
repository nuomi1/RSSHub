import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: '3708', label: '通知公告' },
    { value: '3709', label: '学院要闻' },
    { value: '3710', label: '常用下载' },
    { value: '3725', label: '博士后流动站' },
    { value: '3729', label: '学生指导' },
    { value: '3732', label: '科研动态' },
    { value: '3733', label: '科技成果' },
    { value: '3740', label: '党建理论' },
    { value: '3741', label: '党建学习' },
    { value: '3742', label: '党建活动' },
    { value: '3743', label: '党建风采' },
    { value: '3744', label: '团学组织' },
    { value: '3745', label: '学生党建' },
    { value: '3746', label: '学生活动' },
    { value: '3747', label: '心理健康' },
    { value: '3748', label: '青春榜样' },
    { value: '3751', label: '就业工作' },
    { value: '3752', label: '校友风采' },
    { value: '3753', label: '校庆专栏' },
    { value: '3755', label: '专业介绍' },
    { value: '3756', label: '本科生培养方案' },
    { value: '3759', label: '硕士生培养方案' },
    { value: 'nlzfjs', label: '能力作风建设' },
    { value: 'pyfa', label: '博士生培养方案' },
    { value: 'sjsyjxsfzx', label: '省级实验教学示范中心' },
    { value: 'srxxgcddesdjs', label: '喜迎二十大系列活动' },
    { value: 'xxgcssscddhjs', label: '学习贯彻省十三次党代会精神' },
];
const CATEGORY_OPTIONS_DEFAULT = '3709';

export const route: Route = {
    path: '/cs/:category?',
    name: '计算机学院',
    url: 'cs.hrbust.edu.cn',
    maintainers: ['cscnk52'],
    handler,
    example: '/hrbust/cs',
    parameters: { category: { description: '栏目标识，默认为 3709（学院要闻）', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '栏目标识',
        options: CATEGORY_OPTIONS,
    }),
    categories: ['university'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
        supportRadar: true,
    },
    radar: [
        {
            source: ['cs.hrbust.edu.cn/:category/list.htm'],
            target: '/cs/:category',
        },
        {
            source: ['cs.hrbust.edu.cn'],
            target: '/cs',
        },
    ],
    view: ViewType.Notifications,
};

async function handler(ctx) {
    const rootUrl = 'https://cs.hrbust.edu.cn/';
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const columnUrl = `${rootUrl}${category}/list.htm`;
    const response = await ofetch(columnUrl);
    const $ = load(response);
    const bigTitle = $('li.col_title').text();

    const list = $('div.col_news_con li.news')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const element = $(item);
            const link = new URL(element.find('a').attr('href')!, rootUrl).href;
            const pubDateText = element.find('span.news_meta').text();
            const pubDate = pubDateText ? timezone(parseDate(pubDateText), 8) : null;
            return {
                title: element.find('a').text().trim(),
                pubDate,
                link,
            };
        });

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link, async () => {
                if (!item.link.startsWith(rootUrl)) {
                    item.description = '本文需跳转，请点击原文链接后阅读';
                    return item;
                }

                const response = await ofetch(item.link);
                const $ = load(response);
                const content = $('div.wp_articlecontent');

                content.find('[style]').removeAttr('style');
                content.find('font').contents().unwrap();
                content.html(content.html()?.replaceAll('&nbsp;', '') ?? '');
                content.find('[align]').removeAttr('align');

                const author = $('span.arti_publisher').text().replace('发布者：', '').trim();

                return {
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    description: content.html(),
                    author,
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: `${bigTitle} - 哈尔滨理工大学计算机学院`,
        link: columnUrl,
        language: 'zh-CN' as const,
        item: items,
    };
}
