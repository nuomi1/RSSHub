import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CATEGORY_OPTIONS = [
    { value: 'studyinusa', label: '留学申请' },
    { value: 'career', label: '找工求职' },
    { value: 'lifestyle', label: '生活攻略' },
    { value: 'invest', label: '投资理财' },
    { value: 'visa', label: '签证移民' },
    { value: 'news', label: '时政要闻' },
];

export const route: Route = {
    path: '/blog/:category?',
    categories: ['bbs'],
    example: '/1point3acres/blog',
    parameters: { category: { description: '分类，见下表，可在对应分类页 URL 中找到', options: CATEGORY_OPTIONS } },
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
            source: ['blog.1point3acres.com/:category'],
        },
    ],
    name: '博客',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const categoryMap = {
        studyinusa: {
            title: '留学申请',
            id: 18,
        },
        career: {
            title: '找工求职',
            id: 200,
        },
        lifestyle: {
            title: '生活攻略',
            id: 370,
        },
        invest: {
            title: '投资理财',
            id: 371,
        },
        visa: {
            title: '签证移民',
            id: 194,
        },
        news: {
            title: '时政要闻',
            id: 366,
        },
    };

    const category = ctx.req.param('category');

    const rootUrl = 'https://blog.1point3acres.com';
    const currentUrl = `${rootUrl}/${category}/`;
    const { data } = await got(`${rootUrl}/wp-json/wp/v2/posts`, {
        searchParams: {
            categories: category ? categoryMap[category].id : undefined,
            per_page: getRouteLimit(ctx, 100),
        },
    });

    const items = data.map((item) => {
        const $ = load(item.content.rendered, null, false);
        $('h2').nextAll().remove();
        $('[powered-by="1p3a"], h2').remove();
        $('img').each((_, img) => {
            if (/wp-content\/uploads/.test(img.attribs.src)) {
                img.attribs.src = img.attribs.src.replace(/(-\d+x\d+)/, '');
            }
        });

        return {
            title: item.title.rendered,
            description: $.html(),
            link: item.link,
            pubDate: parseDate(item.date_gmt),
        };
    });

    return {
        title: `${category ? `${categoryMap[category].title} | ` : ''}美国留学就业生活攻略`,
        link: currentUrl,
        item: items,
    };
}
