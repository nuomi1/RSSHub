import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '参数', label: '公告类型' },
    { value: '1', label: '通知公告' },
    { value: '2', label: '教务信息' },
    { value: '3', label: '科研动态' },
];

function parseBulletinDate(value?: string) {
    if (!value?.trim()) {
        return;
    }
    const date = timezone(parseDate(value), 8);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function bulletinLink(value: string | undefined, fallback: string) {
    if (value) {
        try {
            const url = new URL(value, 'https://ehall.wtu.edu.cn');
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                return url.href;
            }
        } catch {
            // Preserve the original bulletin identity for invalid source links.
        }
    }
    return fallback;
}

export const route: Route = {
    path: '/:type',
    categories: ['university'],
    example: '/wtu/2',
    parameters: { type: { description: '公告类型，详见表格', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '信息门户公告',
    maintainers: ['loyio'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '公告类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const apiUrl = 'https://ehall.wtu.edu.cn/wtu/api/queryBulletinListByConditional.do?pageNum=1&pageSize=20&columnId=';
    const listUrl = 'https://ehall.wtu.edu.cn/new/list.html?type=';
    const psgUrl = 'https://ehall.wtu.edu.cn/new/detail-word.html?';
    const map = new Map([
        [1, { title: '通知公告', type: '2', id: '1994a3b58bef4ee887e1efc19881decd' }],
        [2, { title: '教务信息', type: '6', id: '36d47fcd3e774f289adfef1d93138a9d' }],
        [3, { title: '科研动态', type: '7', id: '48e8abfb983b4e4486b69feacad1dc1b' }],
    ]);

    const typeInt = Number.parseInt(ctx.req.param('type'));
    const value = map.get(typeInt);
    if (!value) {
        throw new Error('Unsupported bulletin type. Use 1, 2, or 3.');
    }
    const title = value.title;
    const columnId = value.id;
    const type = value.type;
    const res = await got({
        method: 'get',
        url: `${apiUrl}${columnId}`,
    });
    const resJson = res.data.bulletinList;

    return {
        title: `${title} - 武汉纺织大学信息门户`,
        link: `${listUrl}${type}`,
        description: `${title} - 武汉纺织大学信息门户`,
        item: resJson.map((item) => ({
            title: item.TITLE,
            pubDate: parseBulletinDate(item.CREATE_TIME),
            link: bulletinLink(item.GOTO_URL, `${psgUrl}type=${type}&bulletinId=${item.WID}`),
            author: item.PUBLISH_USER_DEPT_NAME,
        })),
    };
}
