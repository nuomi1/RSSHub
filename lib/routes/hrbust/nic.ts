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
    { value: '3982', label: '服务指南' },
    { value: '3983', label: '常见问题' },
    { value: '3988', label: '新闻动态' },
    { value: '3989', label: '通知公告' },
    { value: '3990', label: '国家政策法规' },
    { value: '3991', label: '学校规章制度' },
    { value: '3992', label: '部门规章制度' },
    { value: '3993', label: '宣传教育' },
    { value: '3994', label: '安全法规' },
];
const CATEGORY_OPTIONS_DEFAULT = '3988';

export const route: Route = {
    path: '/nic/:category?',
    name: '网络信息中心',
    url: 'nic.hrbust.edu.cn',
    maintainers: ['cscnk52'],
    handler,
    example: '/hrbust/nic',
    parameters: { category: { description: '栏目标识，默认为 3988（新闻动态）', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['nic.hrbust.edu.cn/:category/list.htm'],
            target: '/nic/:category',
        },
        {
            source: ['nic.hrbust.edu.cn/'],
            target: '/nic/',
        },
    ],
    view: ViewType.Notifications,
};

async function handler(ctx) {
    const rootUrl = 'https://nic.hrbust.edu.cn/';
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const columnUrl = `${rootUrl}${category}/list.htm`;
    const response = await ofetch(columnUrl);
    const $ = load(response);

    const bigTitle = $('li.col_title').text();

    const list = $('ul.news_list.list2 li')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const element = $(item);
            const title = element.find('a').text().trim();
            const link = new URL(element.find('a').attr('href')!, rootUrl).href;

            const pubDateText = element.find('span.news_meta').text().trim();
            const pubDate = pubDateText ? timezone(parseDate(pubDateText), 8) : null;
            return {
                title,
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

                item.author = $('span.arti_publisher').text().replace('发布者：', '').trim();

                const body = $('div.wp_articlecontent');
                body.find('[style]').removeAttr('style');
                body.find('font').contents().unwrap();
                body.html(body.html()?.replaceAll('&nbsp;', '') ?? '');
                body.find('[align]').removeAttr('align');
                item.description = body.html();
                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: `${bigTitle} - 哈尔滨理工大学网络信息中心`,
        link: columnUrl,
        language: 'zh-CN' as const,
        item: items,
    };
}
