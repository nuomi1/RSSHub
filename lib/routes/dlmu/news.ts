import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'hdyw', label: '海大要闻' },
    { value: 'mthd', label: '媒体海大' },
    { value: 'zhxw', label: '综合新闻' },
    { value: 'yxfc', label: '院系风采' },
    { value: 'hdxb', label: '海大校报' },
    { value: 'llyd', label: '理论园地' },
    { value: 'hdjt', label: '海大讲坛' },
    { value: 'ywhc', label: '艺文荟萃' },
];
const TYPE_OPTIONS_DEFAULT = 'hdyw';

export const route: Route = {
    path: '/news/:type',
    categories: ['university'],
    example: '/dlmu/news/hdyw',
    parameters: { type: { description: '默认为 `hdyw`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '新闻网',
    maintainers: ['arjenzhou'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

const baseUrl = 'https://news.dlmu.edu.cn';

const map = {
    hdyw: '/hdyw.htm',
    mthd: '/mthd.htm',
    zhxw: '/zhxw.htm',
    yxfc: '/yxfc.htm',
    hdxb: '/hdxb.htm',
    llyd: '/llyd.htm',
    hdjt: '/hdjt.htm',
    ywhc: '/ywhc.htm',
};

async function handler(ctx: Context) {
    const { type } = ctx.req.param();
    const link = Object.hasOwn(map, type) ? `${baseUrl}${map[type]}` : `${baseUrl}/hdyw.htm`;
    const response = await ofetch(link);

    const $ = load(response);

    return {
        link: baseUrl,
        title: '大连海事大学新闻',
        item: $('.n-Box .n-right .n-pic-box .n-news dl')
            .slice(0, 10)
            .toArray()
            .map((element) => ({
                link: new URL($('dd a', element).attr('href')!, baseUrl).href,
                title: $('dd a', element).text(),
                description: $('dd p', element).text(),
                pubDate: timezone(parseDate($('i', element).text().slice(1, -1)), 8),
            })),
    };
}
