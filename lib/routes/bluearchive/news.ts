import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const JP = {
    '0': '全て',
    '1': 'イベント',
    '2': 'お知らせ',
    '3': 'メンテナンス',
};

const TYPE_OPTIONS = Object.entries(JP).map(([value, label]) => ({ value, label }));
const TYPE_OPTIONS_DEFAULT = '0';

const handler: Route['handler'] = async (ctx) => {
    const { server } = ctx.req.param();

    switch (server.toUpperCase()) {
        case 'JP':
            return await ja(ctx);
        default:
            throw new InvalidParameterError('Unsupported server. Only JP is supported.');
    }
};

const ja: Route['handler'] = async (ctx) => {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(JP, type)) {
        throw new InvalidParameterError('Unsupported news type. Use 0 (all), 1 (events), 2 (news), or 3 (maintenance).');
    }

    const data = await ofetch<{ data: { rows: Array<{ id: number; content: string; summary: string; publishTime: number }> } }, 'json'>('https://api-web.bluearchive.jp/api/news/list', {
        query: {
            typeId: type,
            pageNum: 16,
            pageIndex: 1,
        },
    });

    return {
        title: `ブルアカ - ${JP[type]}`,
        link: 'https://bluearchive.jp/news/newsJump',
        language: 'ja',
        image: 'https://webcnstatic.yostar.net/ba_cn_web/prod/web/favicon.png', // The CN website has a larger one
        icon: 'https://webcnstatic.yostar.net/ba_cn_web/prod/web/favicon.png',
        logo: 'https://webcnstatic.yostar.net/ba_cn_web/prod/web/favicon.png',
        item: data.data.rows.map((row) => ({
            title: row.summary,
            description: row.content,
            link: `https://bluearchive.jp/news/newsJump/${row.id}`,
            pubDate: parseDate(row.publishTime),
        })),
    };
};

export const route: Route = {
    path: '/news/:server/:type?',
    name: 'News',
    categories: ['game'],
    maintainers: ['equt'],
    example: '/bluearchive/news/jp',
    parameters: {
        server: 'game server (ISO 3166 two-letter country code, case-insensitive), only `JP` is supported for now',
        type: { description: 'news type, checkout the table below for details', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT },
    },
    features: {
        requireConfig: false,
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
