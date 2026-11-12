import { type CheerioAPI, load } from 'cheerio';
import pMap from 'p-map';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'jxyx', label: '教学运行' },
    { value: 'zhsw', label: '综合事务' },
    { value: 'xwgl', label: '学务管理' },
    { value: 'sjjx', label: '实践教学' },
    { value: 'jyjg', label: '教研教改' },
];
const CATEGORY_OPTIONS_DEFAULT = 'jwxt';

const xmut = 'https://jwc.xmut.edu.cn';
export const route: Route = {
    path: '/jwc/bkjw/:category?',
    categories: ['university'],
    example: '/xmut/jwc/bkjw/jxyx',
    parameters: { category: { description: '分类如下表', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    name: '本科生教务处',
    maintainers: ['icecliffs'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};
function parseArticleContent($: CheerioAPI, link: string) {
    const body = $('.v_news_content, #vsb_content_6').first();
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
async function fetchArticleContent(link: string): Promise<Pick<DataItem, 'description' | 'pubDate'>> {
    const res = await got(link, { headers: { referer: xmut } });
    const $ = load(res.data);
    const published = $('div[align="center"]')
        .filter((_, element) => $(element).text().startsWith('文章来源：'))
        .first()
        .text()
        .match(/时间：\s*(\d{4}年\d{2}月\d{2}日\s+\d{2}:\d{2})/)?.[1];
    const date = published ? parseDate(published, 'YYYY年MM月DD日 HH:mm', true) : undefined;
    // The source clock has no offset; use a fixed +08 calendar representation.
    const pubDate = date && !Number.isNaN(date.getTime()) ? timezone(date, 8) : undefined;
    return { description: parseArticleContent($, link) ?? undefined, pubDate };
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
    const { category = 'jwxt' } = ctx.req.param();
    const url = `${xmut}/index/tzgg/${category}.htm`;
    const res = await got(url);
    const $ = load(res.data);
    const itemsArray = $('#result_list table tbody tr')
        .toArray()
        .map((row): DataItem => {
            const res = $('td', row).eq(0);
            const resDate = $('td', row).eq(1);
            const resLink = $('a', res).attr('href');
            let link;
            if (resLink!.startsWith('../../')) {
                const parsedUrl = new URL(resLink!, xmut);
                link = parsedUrl.href;
            } else {
                link = resLink;
            }
            const title = $('a', res).attr('title');
            const pubDate = parseSourceDate(resDate.text());
            return {
                title: title!,
                link,
                pubDate,
            };
        });
    const items = await pMap(
        itemsArray,
        async (item) => {
            const detail = await cache.tryGet(`xmut:bkjw:detail:${item.link}`, () => fetchArticleContent(item.link!));
            return { ...item, description: detail.description, pubDate: detail.pubDate ?? item.pubDate };
        },
        { concurrency: 3 }
    );
    return {
        title: $('title').text(),
        link: url,
        item: items,
    };
}
