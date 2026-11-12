import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const categories = {
    'rsks-tzgg': { url: 'http://rst.shanxi.gov.cn/rsks/tzgg/', title: '通知公告' },
    'rsks-gwyks': { url: 'http://rst.shanxi.gov.cn/rsks/gwyks/', title: '公务员考试' },
    'rsks-sydwks': { url: 'http://rst.shanxi.gov.cn/rsks/sydwks/', title: '事业单位考试' },
    'rsks-zyjsryzgks': { url: 'http://rst.shanxi.gov.cn/rsks/zyjsryzgks/', title: '专业技术人员资格考试' },
    'rsks-qtks': { url: 'http://rst.shanxi.gov.cn/rsks/qtks/', title: '其他考试' },
};

const CATEGORY_OPTIONS = Object.entries(categories).map(([value, item]) => ({ value, label: item.title }));

export const route: Route = {
    path: '/rst/:category',
    categories: ['government'],
    example: '/gov/shanxi/rst/rsks-tzgg',
    parameters: { category: { description: '分类名', options: CATEGORY_OPTIONS } },
    name: '人社厅',
    maintainers: ['wolfyu1991'],
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类名',
        options: CATEGORY_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { category } = ctx.req.param();
    const cfg = categories[category];
    if (!cfg) {
        throw new Error('pattern not matched');
    }
    const { url, title } = cfg;

    const response = await ofetch(url);
    const $ = load(response);

    return {
        title: `山西人事考试专栏 - ${title}`,
        link: url,
        item: await Promise.all(
            $('.exam-main ul.list-items-box-inner li')
                .toArray()
                .map((item) => {
                    const $item = $(item);
                    const contenlUrl = $item.find('a').attr('href');
                    const link = new URL(contenlUrl!, url).href;
                    return cache.tryGet(link, async () => {
                        const fullText = await ofetch(link);
                        const fullTextData = load(fullText);
                        return {
                            title: $item.find('a').text(),
                            description: fullTextData('.common-detail-inner').html(),
                            link,
                        };
                    });
                })
        ),
    };
}
