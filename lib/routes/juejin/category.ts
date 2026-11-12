import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getCategoryBrief, parseList, ProcessFeed } from './utils';

const CATEGORY_OPTIONS = [
    { value: 'backend', label: '后端' },
    { value: 'frontend', label: '前端' },
    { value: 'android', label: 'Android' },
    { value: 'ios', label: 'iOS' },
    { value: 'ai', label: '人工智能' },
    { value: 'freebie', label: '开发工具' },
    { value: 'career', label: '代码人生' },
    { value: 'article', label: '阅读' },
];

export const route: Route = {
    path: '/category/:category',
    categories: ['programming'],
    example: '/juejin/category/frontend',
    parameters: { category: { description: '分类名', options: CATEGORY_OPTIONS } },
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
            source: ['juejin.cn/:category'],
        },
    ],
    name: '分类',
    maintainers: ['DIYgod'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');

    const idResponse = await getCategoryBrief();

    const cat = idResponse.find((item) => item.category_url === category);
    if (!cat) {
        throw new Error('分类不存在');
    }
    const id = cat.category_id;

    const response = await ofetch('https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed', {
        method: 'POST',
        body: {
            id_type: 2,
            sort_type: 300,
            cate_id: id,
            cursor: '0',
            limit: 20,
        },
    });

    const list = parseList(response.data);
    const resultItems = await ProcessFeed(list);

    return {
        title: `掘金 ${cat.category_name}`,
        link: `https://juejin.cn/${category}`,
        description: `掘金 ${cat.category_name}`,
        item: resultItems,
    };
}
