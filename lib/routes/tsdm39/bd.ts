import { load } from 'cheerio';

import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';
import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE = {
    '403': '720P',
    '404': '1080P',
    '405': 'BDMV',
    '4130': '4K',
    '5815': 'AV1',
};

const TYPE_OPTIONS = Object.entries(TYPE).map(([value, label]) => ({ value, label }));

const handler: Route['handler'] = async (ctx) => {
    const { type } = ctx.req.param();

    const cookie = config.tsdm39.cookie;
    if (!cookie) {
        throw new ConfigNotFoundError('缺少 TSDM39 用户登录后的 Cookie 值 <a href="https://docs.rsshub.app/zh/deploy/config#route-specific-configurations">TSDM 相关路由</a>');
    }

    const html = await ofetch(`https://www.tsdm39.com/forum.php?mod=forumdisplay&fid=85${type ? `&filter=typeid&typeid=${type}` : ''}`, {
        headers: {
            Cookie: cookie,
        },
    });

    const $ = load(html);

    const item = $('tbody.tsdm_normalthread')
        .toArray()
        .filter((item) => $(item).find('a.xst').attr('href'))
        .map<DataItem>((item) => {
            const $item = $(item);

            const title = $item.find('a.xst').text();
            const price = $item.find('span.xw1').last().text();
            const link = new URL($item.find('a.xst').attr('href')!, 'https://www.tsdm39.com').href;
            const date = $item.find('td.by em').first().text().trim();

            return {
                title,
                description: `价格：${price}`,
                link,
                pubDate: date ? timezone(parseDate(date), 8) : undefined,
            };
        });

    return {
        title: '天使动漫论坛 - BD',
        link: 'https://www.tsdm39.com/forum.php?mod=forumdisplay&fid=85',
        language: 'zh-CN',
        item,
    };
};

export const route: Route = {
    path: '/bd/:type?',
    name: 'BD',
    categories: ['anime'],
    maintainers: ['equt'],
    example: '/tsdm39/bd',
    parameters: {
        type: {
            description: 'BD type, checkout the table below for details',
            options: TYPE_OPTIONS,
        },
    },
    features: {
        requireConfig: [
            {
                name: 'TSDM39_COOKIES',
                optional: false,
                description: '天使动漫论坛登陆后的 cookie 值，可在浏览器控制台通过 `document.cookie` 获取。',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};
