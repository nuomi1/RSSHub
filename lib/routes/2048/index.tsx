import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '3', label: '最新合集' },
    { value: '4', label: '亞洲無碼' },
    { value: '5', label: '日本騎兵' },
    { value: '13', label: '歐美新片' },
    { value: '15', label: '國內原創' },
    { value: '16', label: '中字原創' },
    { value: '18', label: '三級寫真' },
    { value: '116', label: '有碼.HD' },
    { value: '114', label: '亞洲 SM.HD' },
    { value: '96', label: '日韓 VR/3D' },
    { value: '97', label: '歐美 VR/3D' },
    { value: '119', label: 'S-cute / Mywife / G-area' },
    { value: '23', label: '網友自拍' },
    { value: '24', label: '亞洲激情' },
    { value: '25', label: '歐美激情' },
    { value: '26', label: '露出偷窺' },
    { value: '27', label: '高跟絲襪' },
    { value: '28', label: '卡通漫畫' },
    { value: '135', label: '原創达人' },
    { value: '21', label: '唯美清純' },
    { value: '274', label: '网络正妹' },
    { value: '276', label: '亞洲正妹' },
    { value: '277', label: '素人正妹' },
    { value: '278', label: 'COSPLAY' },
    { value: '29', label: '女优情报' },
    { value: '', label: 'Gif 动图' },
    { value: '213', label: '獨家拍攝' },
    { value: '94', label: '稀有首發' },
    { value: '283', label: '网络见闻' },
    { value: '111', label: '主播實錄' },
    { value: '88', label: '珍稀套圖' },
    { value: '131', label: '名站同步' },
    { value: '180', label: '实用漫画' },
    { value: '72', label: '网盘二区' },
    { value: '272', label: '网盘三区' },
    { value: '195', label: '分享福利' },
    { value: '280', label: '国产精选' },
    { value: '79', label: '高清福利' },
    { value: '216', label: '高清首发' },
    { value: '76', label: '多挂原创' },
    { value: '43', label: '磁链迅雷' },
    { value: '67', label: '正片大片' },
    { value: '66', label: 'H-GAME' },
    { value: '55', label: '有声小说' },
    { value: '78', label: '在线视频' },
    { value: '279', label: '在线快播影院' },
    { value: '48', label: '综合小说' },
    { value: '103', label: '人妻意淫' },
    { value: '50', label: '乱伦迷情' },
    { value: '54', label: '长篇连载' },
    { value: '100', label: '文学作者' },
    { value: '109', label: 'TXT 小说打包' },
    { value: '57', label: '聚友客栈' },
    { value: '136', label: '坛友自售' },
];
const ID_OPTIONS_DEFAULT = '3';

export const route: Route = {
    path: '/:id?',
    categories: ['multimedia'],
    example: '/2048/2',
    parameters: { id: { description: '板块 ID, 见下表，默认为最新合集，即 `3`，亦可在 URL 中找到, 例如, `thread.php?fid-3.html`中, 板块 ID 为`3`', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: true,
        supportPodcast: false,
        supportScihub: false,
        nsfw: true,
    },
    name: '论坛',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '板块 ID',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const id = ctx.req.param('id') ?? ID_OPTIONS_DEFAULT;

    const rootUrl = 'https://hjd2048.com';
    // Resolve the address page before caching the forum URL.
    const domainInfo = await cache.tryGet('2048:domainInfo:v2', async () => {
        const response = await ofetch('https://2048.info');
        const $ = load(response);
        const button = $('.button');
        const target = button.attr('href') || button.attr('onclick')?.match(/window\.open\(\s*(['"])(.*?)\1/)?.[2];
        if (!target) {
            throw new Error('The 2048 address page did not contain a forum link.');
        }
        const url = new URL(target, 'https://2048.info');
        if (!['https:', 'http:'].includes(url.protocol)) {
            throw new Error('The 2048 address page contained an unsupported forum URL.');
        }
        return { url: url.href };
    });
    // 获取重定向后的url
    const redirectResponse = await ofetch.raw(domainInfo.url);
    const redirected = await cache.tryGet(
        `2048:redirected:${new URL(redirectResponse.url).host}`,
        async () => {
            const captchaPage = await ofetch(redirectResponse.url);
            const $captcha = load(captchaPage);
            // Extract the value of safeid from the $captcha HTML content
            const safeidMatch = $captcha.html()?.match(/var\s+safeid\s*=\s*'([^']+)'/);
            const safeid = safeidMatch ? safeidMatch[1] : undefined;
            return {
                url: redirectResponse.url,
                safeid,
            };
        },
        86400, // fixed cookie duration: 24 hours
        false
    );
    const currentUrl = new URL(`thread.php?fid-${id}.html`, redirected.url).href;

    const response = await ofetch.raw(currentUrl, {
        headers: {
            cookie: `_safe=${redirected.safeid}`,
        },
    });

    const $ = load(response._data);
    const currentHost = `https://${new URL(response.url).host}`; // redirected host

    $('#shortcut').remove();
    $('tr[onmouseover="this.className=\'tr3 t_two\'"]').remove();

    const list = $('#ajaxtable tbody .tr2')
        .last()
        .nextAll('.tr3')
        .toArray()
        .map((item): DataItem & { link: string; guid: string } => {
            const $item = $(item).find('a.subject');

            return {
                title: $item.text(),
                link: `${currentHost}/${$item.attr('href')}`,
                guid: `${rootUrl}/2048/${$item.attr('href')}`,
            };
        })
        .filter((item) => !item.link.includes('undefined'));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.guid, async () => {
                const detailResponse = await ofetch(item.link, {
                    headers: {
                        cookie: `_safe=${redirected.safeid}`,
                    },
                });

                const content = load(detailResponse);

                content('.ads, .tips').remove();

                content('ignore_js_op').each((_, el) => {
                    const img = content(el).find('img');
                    const originalSrc = img.attr('data-original');
                    const fallbackSrc = img.attr('src');
                    // 判断是否有 data-original 属性，若有则使用其值，否则使用 src 属性值
                    const imgSrc = originalSrc || fallbackSrc;
                    content(el).replaceWith(`<img src="${imgSrc}">`);
                });

                item.author = content('.fl.black').text();
                item.pubDate = timezone(parseDate(content('span.fl.gray').attr('title')!), 8);

                const readTpc = content('#read_tpc').first();
                const copyLink = content('#copytext')?.first()?.text();
                const readTpcHtml = readTpc.html() ?? '';
                const magnetText = readTpc.find('.magnet-text').first().text().trim();

                // Extract enclosure: rmdown.com (fetch page for magnet) | magnet from 哈希校验 | copyLink
                const rmdownLink = readTpc.find('a[href*="rmdown.com/link.php"]').attr('href');
                const enclosureHref = rmdownLink?.startsWith('http') ? rmdownLink : rmdownLink ? `https://www.rmdown.com/${rmdownLink}` : null;

                if (enclosureHref) {
                    const rmdownPage = await cache.tryGet(`2048:rmdown:${enclosureHref}`, () => ofetch(enclosureHref));
                    const btihMatch = rmdownPage.match(/Code:\s*([a-fA-F0-9]{40})/);
                    const magnetUrl = btihMatch ? `magnet:?xt=urn:btih:${btihMatch[1]}` : null;
                    if (magnetUrl) {
                        item.enclosure_url = magnetUrl;
                        item.enclosure_type = 'x-scheme-handler/magnet';
                    }
                }
                if (!item.enclosure_url) {
                    const hashMatch = readTpcHtml.match(/哈希校验[^;]*;\s*([a-f0-9]{40})\s*[;；]/i);
                    const magnetFromHash = hashMatch ? `magnet:?xt=urn:btih:${hashMatch[1]}` : null;
                    const magnetFromText = magnetText.match(/magnet:\?xt=urn:btih:[^\s"'<>]+/)?.[0];
                    const magnetLink = magnetFromText ?? readTpcHtml.match(/magnet:\?xt=urn:btih:[^\s"'<>]+/)?.[0] ?? magnetFromHash ?? copyLink;
                    if (magnetLink?.startsWith('magnet')) {
                        item.enclosure_url = magnetLink;
                        item.enclosure_type = 'x-scheme-handler/magnet';
                    }
                }

                content('.showhide img').each((_, el) => {
                    readTpc.append(`<br><img style="max-width: 100%;" src="${content(el).attr('src')}">`);
                });

                item.description = readTpc.html();

                return item;
            })
        )
    );

    return {
        title: `${$('#main #breadCrumb a').last().text()} - 2048核基地`,
        link: currentUrl,
        item: items,
    };
}
