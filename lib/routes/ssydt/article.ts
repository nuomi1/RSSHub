import type { Context } from 'hono';
import pMap from 'p-map';

import NotFoundError from '@/errors/types/not-found';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '0', label: '推荐' },
    { value: '3', label: '时事日报' },
    { value: '6', label: '时事专题' },
    { value: '13', label: '备考技巧' },
    { value: '12', label: '招考信息' },
    { value: '4', label: '时事月报' },
    { value: '10', label: '重要会议' },
    { value: '11', label: '领导讲话' },
    { value: '5', label: '时事周刊' },
    { value: '8', label: '官网公告' },
    { value: '7', label: '时事评论' },
];

export const route: Route = {
    path: '/article/:id?',
    categories: ['new-media'],
    example: '/ssydt/article',
    parameters: { id: { description: 'id，见下表，默认为推荐', options: ID_OPTIONS } },
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '编号',
        options: ID_OPTIONS,
    }),
    name: '资讯',
    maintainers: ['nczitzk'],
    handler,
};

const titles = new Map([
    ['0', '推荐'],
    ['3', '时事日报'],
    ['6', '时事专题'],
    ['13', '备考技巧'],
    ['12', '招考信息'],
    ['4', '时事月报'],
    ['10', '重要会议'],
    ['11', '领导讲话'],
    ['5', '时事周刊'],
    ['8', '官网公告'],
    ['7', '时事评论'],
]);

async function handler(ctx: Context) {
    const { id = '' } = ctx.req.param();

    const rootUrl = 'https://www.ssydt.com';
    const currentUrl = `${rootUrl}/api/article/articles?product=ssydt&terminal=Browser&pageSize=20&articleTypeId=${id}`;
    const response = await ofetch(currentUrl);

    const list: Array<DataItem & { link: string }> = response.results.map((item) => ({
        guid: String(item.id),
        title: item.title,
        category: item.typeName ? [item.typeName] : undefined,
        link: `${rootUrl}/article/${item.id}`,
        pubDate: item.gmtCreate ? timezone(parseDate(item.gmtCreate), 8) : undefined,
    }));

    const items = await pMap(
        list,
        async (item) => {
            const detail = await cache.tryGet(`ssydt:article:detail:v3:${item.link}`, async () => {
                const detailResponse = await ofetch<ArticleDetailResponse>(`${rootUrl}/api/article/webArticles/${item.guid}`);
                const description = detailResponse.results?.ssArticleArticleText?.content;
                if (!description) {
                    throw new NotFoundError(`Article ${item.guid} has no public content in the official detail response.`);
                }
                return { description };
            });
            return { ...item, ...detail };
        },
        { concurrency: 3 }
    );

    return {
        title: `${titles.get(id || '0')} - 时事一点通`,
        link: `${rootUrl}/article?type=${id}`,
        item: items,
    };
}

interface ArticleDetailResponse {
    results?: {
        ssArticleArticleText?: { content?: string };
    };
}
