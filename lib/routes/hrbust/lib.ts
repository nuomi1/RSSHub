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
    { value: '3421', label: '公告消息' },
    { value: '3422', label: '资源动态' },
    { value: 'ckzx', label: '参考中心' },
    { value: 'cygj', label: '常用工具' },
    { value: 'wjfw', label: '外借服务' },
    { value: 'ytjfw', label: '报告厅及研讨间服务' },
    { value: 'yw', label: '外文引进数据库' },
    { value: 'yw_3392', label: '外文电子图书' },
    { value: 'yw_3395', label: '外文试用数据库' },
    { value: 'zw', label: '中文引进数据库' },
    { value: 'zw_3391', label: '中文电子图书' },
    { value: 'zw_3394', label: '中文试用数据库' },
];
const CATEGORY_OPTIONS_DEFAULT = '3421';

export const route: Route = {
    path: '/lib/:category?',
    name: '图书馆',
    url: 'lib.hrbust.edu.cn',
    maintainers: ['cscnk52'],
    handler,
    example: '/hrbust/lib',
    parameters: { category: { description: '栏目标识，默认为 3421（公告消息）', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['lib.hrbust.edu.cn/:category/list.htm'],
            target: '/lib/:category',
        },
        {
            source: ['lib.hrbust.edu.cn'],
            target: '/lib',
        },
    ],
    view: ViewType.Notifications,
};

async function handler(ctx) {
    const rootUrl = 'https://lib.hrbust.edu.cn/';
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const columnUrl = `${rootUrl}${category}/list.htm`;
    const response = await ofetch(columnUrl);
    const $ = load(response);
    const bigTitle = $('span.Column_Anchor').text();

    const list = $('ul.tu_b3 li:not([class])')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const element = $(item);
            const link = new URL(element.find('a').attr('href')!, rootUrl).href;
            const pubDateText = element.find('span').text().trim();
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
                const cleaned = content.html()?.replaceAll('&nbsp;', '');
                if (cleaned !== undefined) {
                    content.html(cleaned);
                }
                content.find('[align]').removeAttr('align');

                return {
                    title: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    description: content.html(),
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: `${bigTitle} - 哈尔滨理工大学图书馆`,
        link: columnUrl,
        language: 'zh-CN' as const,
        item: items,
    };
}
