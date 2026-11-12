import { load } from 'cheerio';
import iconv from 'iconv-lite';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '1', label: '社会动态' },
    { value: '5', label: '院内新闻' },
    { value: '3', label: '学术观点' },
    { value: '4', label: '文献书籍' },
    { value: '6', label: '工作论文' },
    { value: '8', label: '专题讨论' },
];
const ID_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/:id?',
    categories: ['new-media'],
    example: '/ciidbnu',
    parameters: { id: { description: '分类 id，可在分类页地址栏 URL 中找到', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;

    const rootUrl = 'http://www.ciidbnu.org';
    const currentUrl = `${rootUrl}/new1.asp?pagetype=${id}`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    const list = $('#newsrightlist a')
        .slice(0, 10)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')!.replace(/^\.\./, '')}`,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                    responseType: 'buffer',
                });
                const content = load(iconv.decode(detailResponse.data, 'gbk'));

                item.description = content('#text').html();
                item.pubDate = timezone(parseDate(content('.t8').eq(0).text(), 'YYYY/M/D H:mm:ss'), 8);

                content('.t14').remove();

                item.author = content('#author').text();

                return item;
            })
        )
    );

    return {
        title: `${$('h3').text()} - 中国收入分配研究院`,
        link: currentUrl,
        item: items,
    };
}
