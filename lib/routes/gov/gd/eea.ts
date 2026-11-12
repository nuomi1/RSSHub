import { load } from 'cheerio';
import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATY_OPTIONS = [
    { value: 'kszs', label: '考试招生' },
    { value: 'shks', label: '社会考试' },
    { value: 'zkgs', label: '招考公示' },
    { value: 'bkzn', label: '报考指南' },
    { value: 'ywdt', label: '要闻动态' },
    { value: 'gkzl', label: '公开专栏' },
    { value: 'zcwj', label: '政策文件' },
    { value: 'zcjd', label: '政策解读' },
];

export const route: Route = {
    path: '/eea/:caty',
    categories: ['government'],
    example: '/gov/gd/eea/kszs',
    parameters: {
        caty: { description: '资讯类别', options: CATY_OPTIONS },
    },
    name: '省教育考试院',
    maintainers: ['icealtria'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: '资讯类别',
        options: CATY_OPTIONS,
    }),
};

const rootUrl = 'https://eea.gd.gov.cn/';

const config = {
    kszs: { link: '/bmbk/kszs/', title: '考试招生' },
    shks: { link: '/shks/', title: '社会考试' },
    zkgs: { link: '/zwgk_zkgs/', title: '招考公示' },
    bkzn: { link: '/bmbk/bkzn/', title: '报考指南' },
    ywdt: { link: '/news/', title: '要闻动态' },
    gkzl: { link: '/zwgk/gkzl/', title: '公开专栏' },
    zcwj: { link: '/zwgk/zwwj/', title: '政策文件' },
    zcjd: { link: '/zcjd/', title: '政策解读' },
};

async function handler(ctx: Context) {
    const { caty } = ctx.req.param();
    const cfg = config[caty];
    if (!Object.hasOwn(config, caty)) {
        throw new InvalidParameterError('Bad category. See docs');
    }

    const currentUrl = new URL(cfg.link, rootUrl).href;
    const response = await ofetch(currentUrl);

    const $ = load(response);
    const list = $('div.main>div.content>ul>li')
        .toArray()
        .map((item): DataItem => {
            const a = $(item).find('a');
            return {
                title: a.text(),
                link: a.attr('href'),
                pubDate: getPublicationDate($(item).find('span.time').text()),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link!, async () => {
                if (item.link!.startsWith('https://mp.weixin.qq.com/')) {
                    return item;
                }
                const detailResponse = await ofetch(item.link!);
                const content = load(detailResponse);
                item.description = content('div.article').html();
                item.author = content('meta[name="ContentSource"]').attr('content');
                item.pubDate = getPublicationDate(content('span.time').text()) ?? getPublicationDate(content('meta[name="PubDate"]').attr('content')) ?? item.pubDate;
                return item;
            })
        )
    );

    return {
        title: `广东省教育考试院 - ${cfg.title}`,
        link: currentUrl,
        item: items,
    };
}

function getPublicationDate(dateText: string | undefined) {
    const date = dateText ? parseDate(dateText) : undefined;
    return date && !Number.isNaN(date.getTime()) ? timezone(date, 8) : undefined;
}
