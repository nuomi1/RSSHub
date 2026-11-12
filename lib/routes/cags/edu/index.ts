import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const host = 'https://edu.cags.ac.cn';

const titles = {
    tzgg: '通知公告',
    ywjx: '要闻简讯',
    zs_bss: '博士生招生',
    zs_sss: '硕士生招生',
    zs_dxsxly: '大学生夏令营',
};

const CATEGORY_OPTIONS = Object.entries(titles).map(([value, label]) => ({ value, label }));

export const route: Route = {
    path: '/edu/:category',
    categories: ['university'],
    example: '/cags/edu/tzgg',
    parameters: {
        category: { description: '通知频道，可选 tzgg/ywjx/zs_bss/zs_sss/zs_dxsxly', options: CATEGORY_OPTIONS },
    },
    features: {
        antiCrawler: false,
        requireConfig: false,
        requirePuppeteer: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '研究生院',
    maintainers: ['Chikit-L'],
    radar: [
        {
            title: titles.tzgg,
            source: ['edu.cags.ac.cn/'],
            target: '/edu/tzgg',
        },
    ],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '通知频道',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');
    const title = titles[category];

    if (!title) {
        throw new Error(`Invalid category: ${category}`);
    }

    const API_URL = `${host}/api/cms/cmsNews/pageByCmsNavBarId/${category}/1/10/0`;
    const response = await ofetch(API_URL);
    const data = response.data;

    const items = data.map((item) => {
        const id = item.id;
        const title = item.title;

        let pubDate: Date | null = null;
        if (item.publishDate) {
            pubDate = parseDate(item.publishDate, 'YYYY-MM-DD');
            pubDate = timezone(pubDate, 8);
        }

        const link = `${host}/#/dky/view/id=${id}/barId=${category}`;

        return {
            title,
            description: item.introduction,
            link,
            guid: link,
            pubDate,
        };
    });

    return {
        title,
        link: `${host}/#/dky/list/barId=${category}/cmsNavCategory=1`,
        item: items,
    };
}
