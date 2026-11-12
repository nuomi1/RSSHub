import { load } from 'cheerio';
import iconv from 'iconv-lite';

import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const cateUrlMap = {
    lastupdate: 'https://www.wenku8.net/modules/article/toplist.php?sort=lastupdate',
    fullflag: 'https://www.wenku8.net/modules/article/articlelist.php?fullflag=1',
    postdate: 'https://www.wenku8.net/modules/article/toplist.php?sort=postdate',
    anime: 'https://www.wenku8.net/modules/article/toplist.php?sort=anime',
    allvisit: 'https://www.wenku8.net/modules/article/toplist.php?sort=allvisit',
    articlelist: 'https://www.wenku8.net/modules/article/articlelist.php',
};

const cateTitleMap = {
    lastupdate: '今日更新',
    fullflag: '完结全本',
    postdate: '新书一览',
    anime: '动画化作品',
    allvisit: '热门轻小说',
    articlelist: '轻小说列表',
};

const CATEGORY_OPTIONS = Object.entries(cateTitleMap).map(([value, label]) => ({ value, label }));
const CATEGORY_OPTIONS_DEFAULT = 'lastupdate';

export const route: Route = {
    path: '/:category?',
    categories: ['reading'],
    example: '/wenku8/lastupdate',
    parameters: { category: { description: '首页分类，见下表，默认为今日更新', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: [
            {
                name: 'WENKU8_COOKIE',
                description: '登陆轻小说文库后的 cookie',
            },
        ],
    },
    name: '首页分类',
    maintainers: ['Fatpandac'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '首页分类',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;
    if (!Object.hasOwn(cateUrlMap, category)) {
        throw new InvalidParameterError(`Unknown category. Supported categories: ${Object.keys(cateUrlMap).join(', ')}.`);
    }
    if (!config.wenku8.cookie) {
        throw new ConfigNotFoundError('WENKU8_COOKIE is required. Configure a logged-in Wenku8 cookie to access this category.');
    }
    const response = await got({
        method: 'get',
        url: cateUrlMap[category],
        responseType: 'buffer',
        headers: {
            'User-Agent': config.ua,
            cookie: config.wenku8.cookie,
        },
    });

    const responseHtml = iconv.decode(response.data, 'gbk');

    const $ = load(responseHtml);
    const items = $('td > div')
        .toArray()
        .map((item) => {
            const sourceDate = $(item)
                .find('p')
                .text()
                .match(/更新[:：]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
            const date = sourceDate ? parseDate(sourceDate, 'YYYY-MM-DD', true) : undefined;
            return {
                title: $(item).find('b > a').text(),
                link: $(item).find('b > a').attr('href'),
                description: $(item).find('img').html()! + $(item).find('div:nth-child(2)').remove('b').end().html()!,
                pubDate: date && Number.isFinite(date.getTime()) ? timezone(date, 8) : undefined,
            };
        });

    return {
        title: `轻小说文库 - ${cateTitleMap[category]}`,
        link: cateUrlMap[category],
        item: items,
    };
}
