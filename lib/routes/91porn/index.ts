import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { renderIndexDescription } from './templates/index';
import { domainValidation } from './utils';

const LANG_OPTIONS = [
    { value: 'en_US', label: 'English' },
    { value: 'cn_CN', label: '简体中文' },
    { value: 'zh_ZH', label: '繁體中文' },
];
const LANG_OPTIONS_DEFAULT = 'en_US';

export const route: Route = {
    path: '/:lang?',
    categories: ['multimedia'],
    example: '/91porn',
    parameters: { lang: { description: 'Language, see below, `en_US` by default ', options: LANG_OPTIONS, default: LANG_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
        nsfw: true,
    },
    radar: [
        {
            source: ['91porn.com/index.php'],
            target: '',
        },
    ],
    name: 'Hot Video Today',
    maintainers: ['TonyRL'],
    handler,
    url: '91porn.com/index.php',
    description: renderOptionsMarkdownTable({
        parameter: 'lang',
        description: '语言',
        options: LANG_OPTIONS,
    }),
};

async function handler(ctx) {
    const { domain = '91porn.com' } = ctx.req.query();
    const siteUrl = `https://${domain}/index.php`;
    const { lang = LANG_OPTIONS_DEFAULT } = ctx.req.param();
    domainValidation(domain);

    const response = await got.post(siteUrl, {
        form: {
            session_language: lang,
        },
        headers: {
            referer: siteUrl,
        },
    });

    const $ = load(response.data);

    let items = $('.row .well')
        .toArray()
        .map((item): DataItem & { poster?: string } => {
            const $item = $(item);
            return {
                title: $item.find('.video-title').text(),
                link: $item.find('a').attr('href'),
                poster: $item.find('.img-responsive').attr('src'),
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(`91porn:${lang}:${new URL(item.link!).searchParams.get('viewkey')}`, async () => {
                const { data } = await got(item.link);
                const $ = load(data);

                item.pubDate = parseDate($('.title-yakov').eq(0).text(), 'YYYY-MM-DD');
                item.description = renderIndexDescription({
                    link: item.link!,
                    poster: item.poster!,
                });
                item.author = $('.title-yakov a span').text();
                delete item.poster;

                return item;
            })
        )
    );

    return {
        title: `${$('.login_register_header').text()} - 91porn`,
        link: siteUrl,
        item: items,
    };
}
