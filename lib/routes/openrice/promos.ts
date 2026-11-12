import { load } from 'cheerio';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { renderDescription } from './templates/description';

const LANG_OPTIONS = [
    { value: 'zh-cn', label: '简体' },
    { value: 'zh', label: '繁體' },
    { value: 'en', label: 'EN' },
];
const LANG_OPTIONS_DEFAULT = 'zh';

const baseUrl = 'https://www.openrice.com';

export const route: Route = {
    path: '/:lang/hongkong/promos',
    maintainers: ['after9'],
    handler,
    categories: ['shopping'],
    example: '/openrice/zh/hongkong/promos',
    parameters: { lang: { description: '语言，缺省为 zh', options: LANG_OPTIONS, default: LANG_OPTIONS_DEFAULT } },
    name: '香港餐厅滋讯',
    description: renderOptionsMarkdownTable({
        parameter: 'lang',
        description: '语言',
        options: LANG_OPTIONS,
    }),
};

async function handler(ctx) {
    const lang = ctx.req.param('lang') ?? LANG_OPTIONS_DEFAULT;

    let urlPath;
    switch (lang) {
        case 'zh-cn':
            urlPath = '/zh-cn/hongkong/promos';
            break;
        case 'en':
            urlPath = '/en/hongkong/promos';
            break;
        case 'zh':
        default:
            urlPath = '/zh/hongkong/promos';
            break;
    }
    const response = await ofetch(baseUrl + urlPath, {});
    const $ = load(response);

    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') ?? "What's Hot from Openrice";

    const data = $('.article-listing-content-cell-wrapper');
    const resultList = data.toArray().map((item) => {
        const $item = $(item);
        const title = $item.find('.title-name').text();
        const link = $item.find('a.sr1-listing-content-cell').attr('href') ?? '';
        const coverImg =
            $item
                .find('.cover-photo')
                .attr('style')
                ?.match(/url\(['"]?(.*?)['"]?\)/)?.[1] ?? null;
        const description = renderDescription({
            description: $item.find('.article-details .desc').text(),
            image: coverImg,
        });
        return {
            title,
            description,
            link,
        };
    });

    return {
        title,
        link: baseUrl + urlPath,
        description,
        item: resultList,
    };
}
