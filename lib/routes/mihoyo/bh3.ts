import type { Context } from 'hono';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'latest', label: '最新' },
    { value: 'news', label: '新闻' },
    { value: 'notice', label: '公告' },
    { value: 'activity', label: '活动' },
    { value: 'info', label: '资讯' },
];

const config = {
    latest: {
        id: '693',
        title: '最新',
    },
    news: {
        id: '694',
        title: '新闻',
    },
    notice: {
        id: '695',
        title: '公告',
    },
    activity: {
        id: '696',
        title: '活动',
    },
    info: {
        id: '697',
        title: '资讯',
    },
};

export const route: Route = {
    path: '/bh3/:type',
    categories: ['game'],
    example: '/mihoyo/bh3/latest',
    parameters: { type: { description: '公告种类', options: TYPE_OPTIONS } },
    name: '崩坏 3 - 游戏公告',
    maintainers: ['deepred5', 'nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '公告种类',
        options: TYPE_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { type } = ctx.req.param();
    const cfg = config[type];
    if (!cfg) {
        throw new InvalidParameterError(`Bad type: ${type}`);
    }
    const requestedLimit = Number(ctx.req.query('limit'));
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 10;

    const response = await ofetch(`https://act-api-takumi-static.mihoyo.com/content_v2_user/app/b9d5f96cd69047eb/getContentList?iPageSize=${limit}&iPage=1&sLangKey=zh-cn&iChanId=${cfg.id}&isPreview=0`);

    const items = response.data.list.map((item) => {
        const ext = JSON.parse(item.sExt || '{}');
        const banner = ext[`${item.sChanId[0]}_1`]?.[0]?.url;
        return {
            title: item.sTitle,
            description: (banner ? `<img src="${banner}">` : '') + item.sContent,
            link: `https://bh3.mihoyo.com/news/${item.sChanId[0]}/${item.iInfoId}`,
            pubDate: timezone(parseDate(item.dtStartTime), 8),
            category: item.sCategoryName,
            image: ext[`${item.sChanId[0]}_0`]?.[0]?.url,
        };
    });

    return {
        title: `崩坏3作战资讯 - ${cfg.title}`,
        link: `https://bh3.mihoyo.com/news/${cfg.id}`,
        item: items,
    };
}
