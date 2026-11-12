import { load } from 'cheerio';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { baseUrl, parseItem } from './utils';

const TYPE_OPTIONS = [
    { value: '', label: '所有新聞' },
    { value: 'camera', label: '攝影器材' },
    { value: 'mobile', label: '手機通訊' },
    { value: 'auto', label: '汽車熱話' },
    { value: 'photography', label: '攝影文化' },
    { value: 'videography', label: '影片攝錄' },
    { value: 'reviews', label: '測試報告' },
    { value: 'gadget', label: '生活科技' },
    { value: 'technique', label: '攝影技巧' },
];

export const route: Route = {
    path: '/news/:type?',
    categories: ['new-media'],
    example: '/dcfever/news',
    parameters: { type: { description: '分類，預設為所有新聞', options: TYPE_OPTIONS } },
    name: '新聞中心',
    maintainers: ['TonyRL'],
    handler,
    radar: [
        {
            source: ['dcfever.com/news/index.php'],
            target: '/news',
        },
    ],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '分類',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type');

    const link = new URL(`${baseUrl}/news/index.php`, baseUrl);
    if (type) {
        link.searchParams.append('type', type);
    }
    const response = await ofetch(link.href);
    const $ = load(response);

    const list = $('.col-md-left .title a')
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: new URL($item.attr('href')!, link.href).href,
            };
        });

    const items = await Promise.all(list.map((item) => parseItem(item)));

    return {
        title: `${$('.channel_nav')
            .contents()
            .filter((_, e) => e.nodeType === 3)
            .text()} - ${$('head title').text()}`,
        link: link.href,
        image: 'https://cdn10.dcfever.com/images/android_192.png',
        item: items,
    };
}
