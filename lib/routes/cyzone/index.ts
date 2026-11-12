import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { apiRootUrl, getInfo, processItems, rootUrl } from './util';

const ID_OPTIONS = [
    { value: 'news', label: '最新' },
    { value: '5', label: '快鲤鱼' },
    { value: '14', label: '创投' },
    { value: '13', label: '科创板' },
    { value: '8', label: '汽车' },
    { value: '10', label: '海外' },
    { value: '9', label: '消费' },
    { value: '7', label: '科技' },
    { value: '27', label: '医疗' },
    { value: '11', label: '文娱' },
    { value: '16', label: '城市' },
    { value: '15', label: '政策' },
    { value: '6', label: '特写' },
    { value: '12', label: '干货' },
    { value: '33', label: '科技股' },
];
const ID_OPTIONS_DEFAULT = 'news';

export const route: Route = {
    path: '/:id?',
    categories: ['new-media'],
    example: '/cyzone',
    parameters: { id: { description: '频道 id，可在对应频道页 URL 中找到，默认为 news，即最新资讯', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
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
            source: ['cyzone.cn/channel/:id', 'cyzone.cn/'],
            target: '/:id',
        },
    ],
    name: '资讯',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '频道 id',
        options: ID_OPTIONS,
    }),
};

async function handler(ctx) {
    const { id = ID_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 5);

    const apiUrl = new URL(`v2/content/channel/${id === 'news' ? 'getArticle' : 'detail'}`, apiRootUrl).href;
    const currentUrl = new URL(`channel/${id}`, rootUrl).href;

    const items = await processItems(
        apiUrl,
        limit,
        id === 'news'
            ? {}
            : {
                  channel_id: id,
              }
    );

    return {
        item: items,
        ...(await getInfo(currentUrl)),
    };
}
