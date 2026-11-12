import { load } from 'cheerio';
import type { Context } from 'hono';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATY_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'article', label: '文章' },
    { value: 'podcast', label: 'Podcast' },
];
const CATY_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/:caty?',
    categories: ['new-media'],
    example: '/daodu',
    parameters: { caty: { description: '分類，默認為全部', options: CATY_OPTIONS, default: CATY_OPTIONS_DEFAULT } },
    name: '分類',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: '分類',
        options: CATY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { caty = CATY_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://daodu.tech';
    const currentUrl = `${rootUrl}${caty === 'all' ? '' : `/archive_${caty}`}`;

    const response = await ofetch(currentUrl);
    const $ = load(response);

    const list: DataItem[] = $('h2[itemprop="headline"] a, .post-header .archive__article__title a')
        .slice(0, 15)
        .toArray()
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.text(),
                link: new URL($item.attr('href')!.split('%3F', 1)[0], rootUrl).href,
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await ofetch(item.link!);
                const content = load(detailResponse);

                content('.member-only').remove();

                item.description = content('.post-entry-text').html();
                const pubDate = content('meta[property="article:published_time"]').attr('content');
                item.pubDate = pubDate ? parseDate(pubDate) : undefined;

                return item;
            })
        )
    );

    return {
        title: $('title').text().replace('一覽表', ''),
        link: currentUrl,
        item: items,
    };
}
