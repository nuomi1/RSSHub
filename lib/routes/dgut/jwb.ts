import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: 'jxdt', label: '教学动态' },
    { value: 'jwtz', label: '教务通知' },
    { value: 'jytz', label: '教研通知' },
    { value: 'sjtz', label: '实践通知' },
    { value: 'cyxy', label: '产业学院' },
    { value: 'tsjy', label: '通识教育' },
    { value: 'yznb', label: '"杨振宁" 班' },
    { value: 'zsxx', label: '招生信息' },
    { value: 'cggg', label: '采购公告' },
];
const TYPE_OPTIONS_DEFAULT = 'jwtz';

export const route: Route = {
    path: '/jwb/:type?',
    categories: ['university'],
    example: '/dgut/jwb/jwtz',
    parameters: { type: { description: '哪种通知，默认为教务通知', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    maintainers: ['korokor0', '1200522928'],
    radar: [
        {
            source: ['jwb.dgut.edu.cn/tzgg/'],
            target: '',
        },
    ],
    name: '教务部通知公告',
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '哪种通知',
        options: TYPE_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!['jxdt', 'jwtz', 'jytz', 'sjtz', 'cyxy', 'tsjy', 'yznb', 'zsxx', 'cggg'].includes(type)) {
        throw new InvalidParameterError('Invalid notification type. Use one of the types documented for this route.');
    }
    const url = `https://jwb.dgut.edu.cn/tzgg/${type}.htm`;
    const baseurl = 'https://jwb.dgut.edu.cn/';

    const response = await ofetch(url);
    const $ = load(response);
    const list = $('ul.ul-new4 > li')
        .toArray()
        .map((item) => {
            const $li = $(item);
            const $a = $li.find('a.con');
            return {
                title: $a.find('.tit').text(),
                pubDate: timezone(parseDate(`${$a.find('.year').text()}-${$a.find('.day').text()}`), 8),
                link: `${baseurl}${$a.attr('href')}`,
            };
        });

    const ordered = list;
    const items = await pMap(
        ordered,
        (item) =>
            cache.tryGet(item.link, async () => {
                const response = await ofetch(item.link);
                const $ = load(response);

                return {
                    ...item,
                    description: $('div.v_news_content').html(),
                };
            }),
        { concurrency: 3 }
    );

    return {
        title: $('title').text(),
        link: url,
        item: items,
    };
}
