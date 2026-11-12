import { type CheerioAPI, load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'tzgg', label: '通知公告' },
    { value: 'xwdt', label: '新闻动态' },
    { value: 'xstj', label: '学术研究' },
    { value: 'yjsjw', label: '工作简讯' },
];
const CATEGORY_OPTIONS_DEFAULT = 'yjsc';

const xmut = 'https://yjs.xmut.edu.cn';
export const route: Route = {
    path: '/jwc/yjjw/:category?',
    categories: ['university'],
    example: '/xmut/jwc/yjjw/tzgg',
    parameters: { category: { description: '分类如下表', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '研究生处',
    maintainers: ['icecliffs'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};
function parseArticleContent($: CheerioAPI, link: string) {
    const body = $('body .mainWrap .main_content .v_news_content').first();
    const description = body.html();
    if (!description) {
        return description;
    }
    const seen = new Set(
        body
            .find('a[href]')
            .toArray()
            .map((element) => new URL($(element).attr('href')!, link).href)
    );
    const attachments = $('<ul class="rsshub-attachments"></ul>');
    $('a[href*="/system/_content/download.jsp"]').each((_, element) => {
        const anchor = $(element);
        const url = new URL(anchor.attr('href')!, link);
        if (!['http:', 'https:'].includes(url.protocol) || seen.has(url.href)) {
            return;
        }
        seen.add(url.href);
        const attachmentWrapper1 = $('<li></li>');
        const attachmentAnchor1 = $('<a></a>').attr('href', url.href).text(anchor.text());
        attachmentWrapper1.append(attachmentAnchor1);
        attachments.append(attachmentWrapper1);
    });
    return description + (attachments.children().length ? $.html(attachments) : '');
}
async function fetchArticleContent(link: string): Promise<Pick<DataItem, 'description'>> {
    const detailResponse = await got(link, { headers: { referer: xmut } });
    const $ = load(detailResponse.data);
    return { description: parseArticleContent($, link) };
}
function parseSourceDate(value?: string) {
    const dateText = value?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!dateText) {
        return;
    }
    const date = parseDate(dateText, 'YYYY-MM-DD', true);
    return Number.isNaN(date.getTime()) ? undefined : timezone(date, 8);
}
async function handler(ctx) {
    const { category = 'yjsc' } = ctx.req.param();
    const url = `${xmut}/index/${category}.htm`;
    const res = await got(url, {
        headers: {
            referer: xmut,
        },
    });
    const $ = load(res.data);
    const items = $('.mainWrap .main_con .main_conR ul li')
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);
            return {
                title: $item.find('em').text(),
                link: `${xmut}/` + $item.find('a').attr('href'),
                pubDate: parseSourceDate($item.find('span').text()),
            };
        });
    const itemPromises = await pMap(
        items,
        async (item) => {
            const detail = await cache.tryGet(`xmut:yjs:article:${item.link}`, () => fetchArticleContent(item.link!));
            return { ...item, description: detail.description };
        },
        { concurrency: 3 }
    );
    return {
        title: $('title').text(),
        link: url,
        item: itemPromises,
    };
}
