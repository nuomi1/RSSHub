import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDateInTimezone } from '@/utils/parse-date-in-timezone';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: 'sjjxk', label: '实践教学科' },
    { value: 'jxyxk', label: '教育运行科' },
    { value: 'jyjgk', label: '教研教改科' },
    { value: 'xjglk', label: '学籍管理科' },
    { value: 'ksk', label: '考试科' },
    { value: 'jcjsglk', label: '教材建设管理科' },
];

export const route: Route = {
    path: '/jiaowc/tzgg/:category?',
    categories: ['university'],
    example: '/lsnu/jiaowc/tzgg',
    parameters: { category: { description: '分类名', options: CATEGORY_OPTIONS } },
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
            source: ['lsnu.edu.cn/'],
            target: '/jiaowc/tzgg',
        },
    ],
    name: '教学部通知公告',
    maintainers: ['nyaShine'],
    handler,
    url: 'lsnu.edu.cn/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');
    const url = category ? `https://jiaowc.lsnu.edu.cn/tzgg/${category}.htm` : 'https://jiaowc.lsnu.edu.cn/tzgg.htm';

    const response = await got({
        method: 'get',
        url,
    });

    const data = response.data;

    const $ = load(data);
    const list = $('tr[id^="line_u5_"]').toArray();

    const out = await pMap(
        list,
        async (item) => {
            const $item = $(item);
            const title = $item.find('a').attr('title');
            const link = new URL($item.find('a').attr('href')!, url).href;
            const date = $item.find('td[width="80"]').text().trim();

            const description = await cache.tryGet('lsnu:article:' + link, async () => {
                const response = await got({
                    method: 'get',
                    url: link,
                });

                const articleData = response.data;
                const article$ = load(articleData);
                return article$('.v_news_content').html();
            });

            return {
                title: title!,
                link,
                description,
                pubDate: date ? parseDateInTimezone(date, 8) : undefined,
            };
        },
        { concurrency: 3 }
    );

    return {
        title: '乐山师范学院教学部通知公告',
        link: 'https://jiaowc.lsnu.edu.cn/tzgg.htm',
        item: out,
    };
}
