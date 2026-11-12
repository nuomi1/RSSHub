import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const categories = {
    bnt003000000: 'Beauty',
    bnt002000000: 'Fashion',
    bnt004000000: 'Star',
    bnt007000000: 'Style+',
    bnt009000000: 'Photo',
    bnt005000000: 'Life',
    bnt008000000: 'Now',
};

const CATEGORY_OPTIONS = Object.entries(categories).map(([value, label]) => ({ value, label }));
const CATEGORY_OPTIONS_DEFAULT = 'bnt008000000';

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/bntnews/bnt003000000',
    parameters: { category: { description: 'Category ID, see table below, default to Now (bnt008000000)', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Category',
    maintainers: ['iamsnn'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: 'Category ID',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;
    const rootUrl = 'https://www.bntnews.co.kr';
    const currentUrl = `${rootUrl}/article/list/${category}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
        searchParams: {
            returnType: 'ajax',
        },
    });
    const articles = response.data.result?.items || [];

    const list = articles.map((article) => {
        const link = `${rootUrl}/article/view/${article.aid}`;

        return {
            title: article.title,
            link,
            description: article.content,
            pubDate: timezone(parseDate(article.firstPublishDate), 9),
            author: article.reporter?.[0]?.name || '',
        };
    });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);

                const $content = content('.body_wrap .content');

                // Remove ads
                $content.find('.googleBanner').remove();
                $content.find('style').remove();

                if ($content.length > 0) {
                    item.description = $content.html();
                } else {
                    const $articleView = content('.article_view');
                    if ($articleView.length > 0) {
                        item.description = $articleView.html();
                    }
                }

                return item;
            })
        )
    );

    return {
        title: `bntnews - ${categories[category] || category}`,
        link: currentUrl,
        item: items,
    };
}
