import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: 'recommend', label: '精品推荐' },
    { value: 'quality', label: '技术干货' },
    { value: 'growth', label: '职场成长' },
    { value: 'community', label: '社区动态' },
    { value: 'material', label: '组件物料' },
    { value: 'industry', label: '行业动态' },
];
const TYPE_OPTIONS_DEFAULT = 'recommend';

export const route: Route = {
    path: '/article/:type?',
    categories: ['programming'],
    example: '/zaozao/article/quality',
    parameters: { type: { description: '文章分类', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
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
            source: ['www.zaozao.run/article/:type'],
            target: '/article/:type',
        },
    ],
    name: '文章',
    maintainers: ['shaomingbo'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '文章分类',
        options: TYPE_OPTIONS,
    }),
};
async function handler(ctx) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    const response = await got({
        method: 'put',
        url: `https://e.zaozao.run/article/page/${type}`,
        headers: {
            Referer: 'https://www.zaozao.run/',
        },
        body: JSON.stringify({
            pageNo: 1,
            pageSize: 100,
        }),
    });
    if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error('The article API did not return a successful article list.');
    }
    const { data } = response.data;
    return {
        title: '前端早早聊 - 文章',
        link: `https://www.zaozao.run/article/${type}`,
        description: '前端早早聊 - 文章',
        item: data.map((item) => ({
            title: item.title,
            link: item.url,
            author: item.recommenderName,
            pubDate: isOneOf(item.updateAt, [undefined, null]) || item.updateAt === '' ? undefined : parseDate(item.updateAt),
        })),
    };
}

function isOneOf<const T>(value: unknown, values: readonly T[]): value is T {
    const candidates: readonly unknown[] = values;
    return candidates.includes(value);
}
