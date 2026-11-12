import { load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const SECTION_OPTIONS = [
    { value: 'news', label: '首页' },
    { value: 'gazette', label: '特稿' },
    { value: 'research-', label: '学术' },
    { value: 'academics-', label: '教学' },
    { value: 'international', label: '国际' },
    { value: 'campus', label: '校园' },
    { value: 'people', label: '人物' },
    { value: 'multimedia', label: '视讯' },
    { value: 'notice', label: '公告' },
];
const SECTION_OPTIONS_DEFAULT = 'news';

const url = 'https://news.shisu.edu.cn';
const banner = 'https://news.shisu.edu.cn/news/index/39adf3d9ae414bc39c6d3b9316ae531f.png';

export const route: Route = {
    path: '/news/:section',
    categories: ['university'],
    example: '/shisu/news/news',
    parameters: { section: { description: '主站的新闻类别', options: SECTION_OPTIONS, default: SECTION_OPTIONS_DEFAULT } },
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
            source: ['news.shisu.edu.cn/:section/index.html'],
            target: '/news/:section',
        },
    ],
    name: '上外新闻',
    maintainers: ['Duuckjing'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'section',
        description: '主站的新闻类别',
        options: SECTION_OPTIONS,
    }),
};

async function handler(ctx) {
    const { section = SECTION_OPTIONS_DEFAULT } = ctx.req.param();
    const r = await ofetch(`${url}/${section}/index.html`);
    const $ = load(r);
    let itemsoup: Array<DataItem & { link: string }>;
    switch (section) {
        case 'news':
            itemsoup = $('#gallery-wrapper > article')
                .toArray()
                .map((i0) => {
                    const i = $(i0);
                    const img = i.find('img').attr('src');
                    return {
                        title: i.find('h1 > a').text(),
                        link: `${url}${i.find('a').attr('href')}`,
                        category: i.find('.in-con02 > span:nth-child(1)').text(),
                        itunes_item_image: `${url}${img}`,
                    };
                });
            break;
        default:
            itemsoup = $('li.clear')
                .toArray()
                .flatMap((i0) => {
                    const i = $(i0);
                    const a = i.find('h3 > a');
                    const title = a.attr('title') || a.text();
                    const href = a.attr('href');
                    return title && href ? { title, link: new URL(href, url).href, category: i.find('p>span:nth-child(1)').text() } : [];
                });
    }
    const items = await pMap(
        itemsoup,
        async (item) => {
            const detail = await cache.tryGet(item.link, async () => {
                const r = await ofetch(item.link);
                const $ = load(r);
                const img = $('.tempWrap > ul > li:nth-child(1)> img').attr('src');
                const date = $('.math_time_l > span:nth-child(2)').text().trim();
                return {
                    description: $('.ot_main_r .content').html(),
                    author: $('.math_time_l > span:nth-child(3)').text().trim(),
                    pubDate: date ? parseDate(`${date}T00:00:00+08:00`) : undefined,
                    itunes_item_image: img ? `${url}${img}` : undefined,
                };
            });
            return { ...item, ...detail, itunes_item_image: item.itunes_item_image || detail.itunes_item_image || banner };
        },
        { concurrency: 3 }
    );

    return {
        title: `上外新闻|SISU TODAY - ${section.charAt(0).toUpperCase() + section.slice(1)}`,
        image: 'https://upload.wikimedia.org/wikipedia/zh/thumb/0/06/Shanghai_International_Studies_University_logo.svg/300px-Shanghai_International_Studies_University_logo.svg.png',
        link: `${url}/${section}/index.html`,
        item: items,
    };
}
