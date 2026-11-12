import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CATY_OPTIONS = [
    { value: 'latest', label: '最新' },
    { value: 'hot', label: '热门' },
    { value: 'recommend', label: '推荐' },
];

const config = {
    recommend: {
        link: 'shots!1!0!0!0!0',
        title: '推荐',
    },
    latest: {
        link: 'shots!2!0!0!0!0',
        title: '最新',
    },
    hot: {
        link: 'shots!3!0!0!0!0',
        title: '热门',
    },
};

export const route: Route = {
    path: '/shots/:caty',
    categories: ['new-media'],
    example: '/meihua/shots/latest',
    parameters: { caty: { description: '分类，见下表', options: CATY_OPTIONS } },
    name: '作品',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'caty',
        description: '分类',
        options: CATY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { caty } = ctx.req.param();
    const cfg = config[caty];
    if (!cfg) {
        throw new InvalidParameterError(`Bad category: ${caty}`);
    }

    const currentUrl = `https://www.meihua.info/${cfg.link}`;
    const response = await ofetch(currentUrl);
    const data = JSON.parse(response.match(/"shotsStore":(.*?),"commentStore":/)[1]);

    const shotList: Array<DataItem & { link: string }> = data.shotsData.list.map((item) => ({
        title: item.title,
        link: `https://www.meihua.info/shots/${item.compositionId}`,
        pubDate: item.gmtPublish !== undefined && item.gmtPublish !== null ? parseDate(item.gmtPublish) : undefined,
    }));

    const items = await pMap(
        shotList,
        async (item) => ({
            ...item,
            ...(await cache.tryGet(`meihua:body:${item.link}`, async () => {
                const contentResponse = await ofetch(item.link);
                const content = load(contentResponse);

                return { description: content('div.summary').html() };
            })),
        }),
        { concurrency: 3 }
    );

    return {
        title: `${cfg.title}作品 - 梅花网`,
        link: currentUrl,
        item: items,
    };
}
