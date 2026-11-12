import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Data, DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'zhxw', label: '综合新闻' },
    { value: 'xxgg_new', label: '信息公告' },
    { value: 'xsjwhhd_new', label: '学术文化' },
    { value: 'xyfc_new', label: '校园风采' },
    { value: 'kjzx_new', label: '科教在线' },
    { value: 'mtbh_new', label: '媒体北航' },
    { value: 'ztxw', label: '专题新闻' },
    { value: 'bhrw', label: '北航人物' },
];

export const route: Route = {
    path: '/news/:type',
    categories: ['university'],
    example: '/buaa/news/zhxw',
    parameters: { type: { description: '新闻版块', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '新闻网',
    maintainers: ['AlanDecode'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '新闻版块',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx: Context): Promise<Data> {
    const baseUrl = 'https://news.buaa.edu.cn';
    const type = ctx.req.param('type');

    const link = `${baseUrl}/${type}.htm`;
    const { data: response } = await got(link);

    const $ = load(response);
    const title = $('.position-box a').last().text() || $('.subnav span').text();
    const list: DataItem[] = $('.twlist > ul > li, .mainleft > .listlefttop > .listleftop1')
        .toArray()
        .map((item_) => {
            const item = $(item_);
            const title = item.find('.pub_info h3, h2 > a');
            const link = item.find('a').first();
            const yearMonth = item.find('.pub_date span').text();
            const day = item.find('.pub_date b').text();
            const date = yearMonth && day ? `${yearMonth.replace('.', '-')}-${day}` : item.find('h2 em').text().replaceAll(/[[\]]/g, '');
            return {
                title: title.text(),
                link: new URL(link.attr('href')!, baseUrl).href,
                pubDate: date ? timezone(parseDate(date, 'YYYY-MM-DD'), 8) : undefined,
            };
        });
    const orderedList = list;
    const entries = orderedList;
    const result = await Promise.all(
        entries.map((item) =>
            cache.tryGet(item.link!, async () => {
                const response = await got(item.link);
                const $ = load(response.data);

                item.description = $('.v_news_content').html();
                item.author = $('.vsbcontent_end').text().trim();

                return item;
            })
        )
    );

    return {
        title: `北航新闻 - ${title}`,
        link,
        description: `北京航空航天大学新闻网 - ${title}`,
        language: 'zh-CN',
        item: result,
    };
}
