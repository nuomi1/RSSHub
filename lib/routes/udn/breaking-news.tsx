import { load } from 'cheerio';
import { renderToString } from 'hono/jsx/dom/server';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '0', label: '精選' },
    { value: '1', label: '要聞' },
    { value: '2', label: '社會' },
    { value: '3', label: '地方' },
    { value: '4', label: '兩岸' },
    { value: '5', label: '國際' },
    { value: '6', label: '財經' },
    { value: '7', label: '運動' },
    { value: '8', label: '娛樂' },
    { value: '9', label: '生活' },
    { value: '11', label: '股市' },
    { value: '12', label: '文教' },
    { value: '13', label: '數位' },
    { value: '99', label: '不分類' },
];

type ArticleSummary = {
    title: string;
    titleLink: string;
    time: { date: string };
};

export const route: Route = {
    path: '/news/breakingnews/:id',
    categories: ['traditional-media'],
    example: '/udn/news/breakingnews/99',
    parameters: { id: { description: '类别', options: ID_OPTIONS } },
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
            source: ['udn.com/news/breaknews/1/:id', 'udn.com/'],
        },
    ],
    name: '即時新聞',
    maintainers: ['miles170', 'pseudoyu'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '类别',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id');
    const link = `/news/breaknews/1/${id}#breaknews`;
    const name = await getLinkName(link);
    const rootUrl = 'https://udn.com';
    const response = await got(`${rootUrl}/api/more?page=1&channelId=1&cate_id=${id}&type=breaknews`);
    const list: ArticleSummary[] = response.data.lists;

    const items = await pMap(
        list,
        async (item) => {
            let link = item.titleLink.startsWith('http') ? item.titleLink : `${rootUrl}${item.titleLink}`;
            const linkUrl = new URL(link);
            // cleanup query paramter
            linkUrl.search = '';
            link = linkUrl.href;

            const details = await cache.tryGet(`udn:breaking:detail:v3:${link}`, async () => {
                let result = await got(link);
                // VIP article requires redirection
                // e.g. https://udn.com/news/story/7331/6576320
                const vip = result.data.match(/<script language=javascript>window\.location\.href="(https?:\/\/[^"]+)"/);
                if (vip) {
                    result = await got(vip[1]);
                }

                const $ = load(result.data);
                const metadata = $('script[type="application/ld+json"]')
                    .eq(0)
                    .text()
                    .trim()
                    .replaceAll(/\p{Cc}/gu, '');
                const data = metadata.startsWith('[') ? JSON.parse(metadata)[0] : JSON.parse(metadata);
                // e.g. https://udn.com/news/story/7331/6576320
                const content = $('.article-content__editor');
                // e.g. https://udn.com/news/story/7240/6576424
                const body = $('.article-body__editor');

                let description = '';
                if (data.image) {
                    description += renderToString(
                        <figure>
                            <picture>
                                <img src={data.image.contentUrl} alt={data.image.name} />
                            </picture>
                            <figcaption>{data.image.name}</figcaption>
                        </figure>
                    );
                }
                if (content.length) {
                    description += content.html();
                } else if (body.length) {
                    description += body.html();
                }

                if (data.publisher?.name?.includes('轉角國際 udn Global')) {
                    // Global news
                    description = $('.story_body_content')
                        .html()!
                        .split(/<!--\d+-->/g)
                        .slice(1, -1)
                        .join('');
                }

                return {
                    author: [{ name: $('.article-content__author').text().match('中央社')?.at(0) }, { name: data.publisher?.name?.match('轉角國際 udn Global')?.at(0) }, data.author].filter((e) => e?.name),
                    description,
                    category: [data.articleSection, vip ? $('.article-head li.breadcrumb__item:last > b').text() : $("meta[name='subsection']").attr('content'), ...(data.keywords?.split(',') ?? [])],
                };
            });

            const date = item.time?.date;
            const pubDate = date ? parseDate(date, 'YYYY-MM-DD HH:mm', true) : undefined;
            return {
                ...details,
                title: item.title,
                pubDate: pubDate && !Number.isNaN(pubDate.getTime()) ? timezone(pubDate, 8) : undefined,
                link,
            };
        },
        { concurrency: 3 }
    );

    return {
        title: `即時${name} - 聯合新聞網`,
        link: `${rootUrl}${link}`,
        description: 'udn.com 提供即時新聞以及豐富的政治、社會、地方、兩岸、國際、財經、數位、運動、NBA、娛樂、生活、健康、旅遊新聞，以最即時、多元的內容，滿足行動世代的需求',
        item: items,
    };
}

const getLinkName = async (link) => {
    const url = 'https://udn.com/news/breaknews';
    const links = await cache.tryGet(url, async () => {
        const result = await got(url);
        const $ = load(result.data);
        const data = $('.cate-list__subheader a')
            .toArray()
            .map((item) => {
                const $item = $(item);
                return [$item.attr('href'), $item.text().trim()];
            });
        return Object.fromEntries(data);
    });
    if (Object.hasOwn(links, link)) {
        return links[link];
    }
    return '列表';
};
