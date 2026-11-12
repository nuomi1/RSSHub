import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Data, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { getPlaywrightPage } from '@/utils/playwright';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATEGORY_OPTIONS = [
    { value: '1', label: '电影' },
    { value: '2', label: '电视剧' },
    { value: '3', label: '动漫' },
    { value: '4', label: '综艺' },
    { value: '5', label: '短剧' },
    { value: '30', label: '网飞' },
];
const CATEGORY_OPTIONS_DEFAULT = '1';

const isExpiredCertificate = (error: unknown): error is Error => error instanceof Error && (('code' in error && error.code === 'CERT_HAS_EXPIRED') || isExpiredCertificate(error.cause));

async function getBrowserContent(link: string) {
    const { page, destroy } = await getPlaywrightPage(link, { noGoto: true, closeTimeout: 0 });
    try {
        await page.route('**/*', (route) => (['document', 'script', 'xhr', 'fetch', 'stylesheet'].includes(route.request().resourceType()) ? route.continue() : route.abort()));
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForSelector('ul.hl-vod-list li.hl-list-item a.hl-item-thumb[href][title]', { state: 'attached', timeout: 15000 });
        if (new URL(page.url()).origin !== new URL(link).origin) {
            throw new Error('Secshi redirected away from the requested source.');
        }
        return await page.content();
    } finally {
        await destroy();
    }
}

async function getContent(link: string) {
    try {
        const initResponse = await ofetch.raw<string>(link, {
            ignoreResponseError: true,
            redirect: 'manual',
        });
        const cookie = initResponse.headers
            .getSetCookie()
            .map((c) => c.split(';', 1)[0])
            .join('; ');
        return initResponse.ok ? initResponse._data! : await ofetch<string>(link, { headers: { Cookie: cookie } });
    } catch (error) {
        if (!isExpiredCertificate(error)) {
            throw error;
        }
        return getBrowserContent(link);
    }
}

export const route: Route = {
    path: '/:category?',
    categories: ['multimedia'],
    example: '/secshi',
    parameters: { category: { description: '分类，见下表，默认为 `1`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    features: {
        antiCrawler: true,
        requirePuppeteer: true,
    },
    name: '分类',
    maintainers: ['8430177'],
    handler,
    url: 'www.secshi.com',
};

async function handler(ctx: Context): Promise<Data> {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const baseUrl = 'https://www.secshi.com';
    const link = `${baseUrl}/go/${category}.html`;

    const response = await getContent(link);

    const $ = load(response);

    const items = $('ul.hl-vod-list li.hl-list-item')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const a = $item.find('a.hl-item-thumb');
            return {
                title: a.attr('title')!,
                link: new URL(a.attr('href')!, baseUrl).href,
                image: a.attr('data-original'),
            };
        });

    return {
        title: $('head title').text(),
        link,
        language: 'zh-CN',
        item: items,
    };
}
