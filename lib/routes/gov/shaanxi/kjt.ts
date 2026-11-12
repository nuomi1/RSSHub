import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '1061', label: '科技头条' },
    { value: '24', label: '工作动态' },
    { value: '27', label: '基层科技' },
    { value: '25', label: '科技博览' },
    { value: '28', label: '媒体聚焦' },
    { value: '221', label: '通知公告' },
];
const ID_OPTIONS_DEFAULT = '221';

export const route: Route = {
    path: '/kjt/:id?',
    categories: ['government'],
    example: '/gov/shaanxi/kjt',
    parameters: { id: { description: '分类，见下表，默认为通知公告', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '省科学技术厅',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;

    const rootUrl = 'https://kjt.shaanxi.gov.cn';
    const currentUrl = `${rootUrl}/view/iList.jsp?cat_id=${id}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = load(response.data);

    let items = $('.textlist li a')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            return {
                title: $item.text(),
                link: `${rootUrl}${$item.attr('href')}`,
                pubDate: parseDate($item.prev().text()),
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                item.description = content('.info_content').html();
                item.author = content('meta[name="Author"]').attr('content');
                item.pubDate = timezone(parseDate(content('meta[name="PubDate"]').attr('content')!), 8);

                return item;
            })
        )
    );

    return {
        title: `陕西省科学技术厅 - ${$('.catnm').text()}`,
        link: currentUrl,
        item: items,
    };
}
