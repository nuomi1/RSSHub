import { load } from 'cheerio';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const TYPE_OPTIONS = [
    { value: '01', label: '校长信箱' },
    { value: '02', label: '党委信箱' },
];
const TYPE_OPTIONS_DEFAULT = '01';

async function fetch(address) {
    const res = await got(address);
    const $ = load(res.data);
    const content = $('.tb-ct-info tr').filter((_index, row) => $(row).find('.lbl_WJNR, .lbl_HFNR').length > 0);
    return `<table>${content.toString()}</table>`;
}

export const route: Route = {
    path: '/mail/:type?',
    categories: ['university'],
    example: '/csu/mail',
    parameters: { type: { description: '类型', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '校长信箱',
    maintainers: ['j1g5awi'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const baseUrl = 'https://oa.csu.edu.cn';
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `${baseUrl}/mailbox/NoAuth/MailList_Pub?tp=${type}`;

    const response = await got.post(`${baseUrl}/mailbox/NoAuth/Get_MailList_Pub`, {
        form: {
            params: `{"XXLX":"${type}","tjnr":""}`,
            pageSize: 1,
            pageNo: 15,
        },
    });

    const list = response.data.data.map((item) => ({
        title: item.WJBT,
        link: `${baseUrl}/mailbox/NoAuth/MailInInfo?XXLX=${type}&id=${item.NBBM}`,
        pubDate: timezone(parseDate(item.LXSJ), 8),
        author: item.FZDW,
        category: item.NRFL,
    }));

    const out = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                item.description = await fetch(item.link);
                return item;
            })
        )
    );

    return {
        title: `中南大学学校信箱 - ${type === '01' ? '校长信箱' : '党委信箱'}`,
        link,
        item: out,
    };
}
