import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CHANNEL_ID_OPTIONS = [{ value: '6302', label: 'channelId' }];
const CHANNEL_ID_OPTIONS_DEFAULT = '6302';

export const route: Route = {
    path: '/tjftz-notice/:channelId',
    categories: ['government'],
    example: '/gov/tianjin/tjftz-notice/6302',
    parameters: {
        channelId: { description: '公告分类id、详细信息点击源网站https://www.tjftz.gov.cn/请求中寻找', options: CHANNEL_ID_OPTIONS, default: CHANNEL_ID_OPTIONS_DEFAULT },
    },
    radar: [
        {
            source: ['www.tjftz.gov.cn/channels/6302.html', 'tjftz.gov.cn/channels/6302.html'],
            target: '/tjftz-notice/6302',
        },
    ],
    name: '港保税区公告',
    url: 'tjftz.gov.cn',
    maintainers: ['HaoyuLee'],
    description: renderOptionsMarkdownTable({
        parameter: 'channelId',
        description: '公告分类 id',
        options: CHANNEL_ID_OPTIONS,
    }),
    async handler(ctx) {
        const { channelId = CHANNEL_ID_OPTIONS_DEFAULT } = ctx.req.param();
        const url = `https://www.tjftz.gov.cn/channels/${channelId}.html`;
        const { data: response } = await got(url);
        const noticeCate = load(response)('.location').text().trim();
        const item = load(response)('#sec_right>ul li>.layui-row')
            .toArray()
            .map((el) => {
                const $ = load(el);
                const date = $('span').text().trim();
                const pubDate = date ? timezone(parseDate(date, 'YYYY-MM-DD', true), 8) : undefined;
                return {
                    title: `天津保税区:${$('a').attr('title')}`,
                    link: `https://www.tjftz.gov.cn${$('a').attr('href')}`,
                    pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : undefined,
                    author: '天津保税区',
                    description: `
                        <h4>${noticeCate}</h4>
                        <a href="https://www.tjftz.gov.cn${$('a').attr('href')}">${$('a').attr('title')}</a>
                    `,
                };
            });
        return {
            title: '天津港保税区-公告',
            link: url,
            item,
        };
    },
};
