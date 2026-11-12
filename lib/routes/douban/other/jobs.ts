import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const rootUrl = 'https://jobs.douban.com';

const titleMap = {
    social: '社会招聘',
    campus: '校园招聘',
    intern: '实习生招聘',
};
const TYPE_OPTIONS = Object.entries(titleMap).map(([value, label]) => ({ value, label }));

export const route: Route = {
    path: '/jobs/:type',
    categories: ['social-media'],
    example: '/douban/jobs/campus',
    parameters: { type: { description: '招聘类型，见下表', options: TYPE_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '招聘',
    maintainers: ['Fatpandac'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '招聘类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type');
    const url = `${rootUrl}/jobs/${type}`;

    const response = await got.get(url);
    const $ = load(response.data);
    const list = $('div.mod.position');

    const items = list.toArray().map((item) => ({
        title: $(item).find('h3').text(),
        link: `${url}#${$(item).find('h3').attr('id')}`,
        description: $(item).find('div.bd').html(),
    }));

    return {
        title: `豆瓣${titleMap[type]}`,
        link: url,
        item: items,
    };
}
