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
    { value: '1287', label: '政策规章' },
    { value: '1288', label: '资料下载' },
    { value: '1289', label: '处务公开' },
    { value: '1291', label: '招标信息' },
    { value: '1300', label: '岗位职责' },
    { value: '1301', label: '管理办法' },
    { value: '1302', label: '物资处理' },
    { value: '1304', label: '工作动态' },
    { value: '1305', label: '热点新闻' },
];
const CATEGORY_OPTIONS_DEFAULT = '1305';

export const route: Route = {
    path: '/gzc/:category?',
    name: '国有资产管理处',
    url: 'gzc.hrbust.edu.cn',
    maintainers: ['cscnk52'],
    handler,
    example: '/hrbust/gzc',
    parameters: { category: { description: '栏目标识，默认为 1305（热点新闻）', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['gzc.hrbust.edu.cn/:category/list.htm'],
            target: '/gzc/:category',
        },
        {
            source: ['gzc.hrbust.edu.cn'],
            target: '/gzc',
        },
    ],
    view: ViewType.Notifications,
};

async function handler(ctx) {
    const rootUrl = 'https://gzc.hrbust.edu.cn/';
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const columnUrl = `${rootUrl}${category}/list.htm`;
    const response = await ofetch(columnUrl);
    const $ = load(response);
    const bigTitle = $('li.col-title').text();

    const list = $('ul.wp_article_list li.list_item')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const element = $(item);
            const link = new URL(element.find('a').attr('href')!, rootUrl).href;
            const pubDateText = element.find('span.Article_PublishDate').text().trim();
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
        title: `${bigTitle} - 哈尔滨理工大学国有资产管理处`,
        link: columnUrl,
        language: 'zh-CN' as const,
        item: items,
    };
}
