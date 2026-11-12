import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'manhuaqingbao', label: '漫画情报' },
    { value: 'qingxiaoshuoqingbao', label: '轻小说情报' },
    { value: 'manhuazhoubian', label: '动漫周边' },
    { value: 'shengyouqingbao', label: '声优情报' },
    { value: 'yinyuezixun', label: '音乐资讯' },
    { value: 'youxizixun', label: '游戏资讯' },
    { value: 'meituxinshang', label: '美图欣赏' },
    { value: 'manzhanqingbao', label: '漫展情报' },
    { value: 'dazahui', label: '大杂烩' },
];

export const route: Route = {
    path: '/news/:category?',
    categories: ['anime'],
    example: '/dmzj/news/donghuaqingbao',
    parameters: { category: { description: '类别', options: CATEGORY_OPTIONS } },
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
            source: ['news.dmzj.com/'],
            target: '/news',
        },
    ],
    name: '新闻站',
    maintainers: ['vzz64'],
    handler,
    url: 'news.dmzj.com/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '类别',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const url = `https://news.dmzj.com/${ctx.req.param('category') || ''}`;
    const response = await got(url);
    const $ = load(response.data);
    return {
        title: $('title').text(),
        link: url,
        item: $('.briefnews_con_li .li_img_de')
            .toArray()
            .map((item) => ({
                title: $(item).find('h3 a').text(),
                link: $(item).find('h3 a').attr('href'),
                author: $(item).find('.head_con_p_o span:nth-child(3)').text().split('：', 2)[1],
                pubDate: timezone(parseDate($(item).find('.head_con_p_o span').first().text(), 'YYYY-MM-DD HH:mm'), 8),
                description: $(item).find('p.com_about').text(),
                category: $(item)
                    .find('.u_comfoot a .bqwarp')
                    .toArray()
                    .map((item) => $(item).text()),
            })),
    };
}
