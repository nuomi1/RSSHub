import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Data, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

import { baseUrl, parseItem, parsePost } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'rumor-mill', label: '謠言風向球' },
    { value: 'issue-observatory', label: '議題觀察室' },
    { value: 'weekly-top-ten-rumors', label: 'TOP10' },
    { value: 'expert-columns', label: '名家專欄' },
    { value: 'research-and-updates', label: '國際視野' },
];

const handler = async (ctx): Promise<Data> => {
    const { category } = ctx.req.param();
    const limit = Math.min(getRouteLimit(ctx, 10), 100);
    const isNumericCategory = !Number.isNaN(Number(category));

    const categoryResponse = await ofetch(`${baseUrl}/wp-json/wp/v2/categories${isNumericCategory ? `/${category}` : ''}`, {
        query: {
            slug: isNumericCategory ? undefined : category,
        },
    });

    if (Array.isArray(categoryResponse) && !categoryResponse.length) {
        throw new InvalidParameterError(`Category "${category}" not found`);
    }
    const categoryInfo = isNumericCategory ? categoryResponse : categoryResponse[0];
    if (!categoryInfo.id) {
        throw new InvalidParameterError(`Category "${category}" not found`);
    }

    const postsResponse = await parsePost(limit, categoryInfo.id);
    const items = parseItem(postsResponse);
    const image = categoryInfo.yoast_head_json.og_image?.[0]?.url;

    return {
        title: categoryInfo.yoast_head_json.title,
        description: categoryInfo.yoast_head_json.og_site_name,
        image,
        logo: image,
        icon: image,
        link: categoryInfo.link,
        language: 'zh-TW',
        item: items,
    };
};

export const route: Route = {
    name: '分類',
    maintainers: ['TonyRL'],
    example: '/tfc-taiwan/category/weekly-top-ten-rumors',
    path: '/category/:category',
    parameters: {
        category: { description: '分類，見下表', options: CATEGORY_OPTIONS },
    },
    handler,
    url: 'tfc-taiwan.org.tw/category/rumor-mill/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分類',
        options: CATEGORY_OPTIONS,
    }),
};
