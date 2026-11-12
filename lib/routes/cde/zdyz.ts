import { load } from 'cheerio';

import NotFoundError from '@/errors/types/not-found';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

import utils from './utils';

const CATEGORY_OPTIONS = [
    { value: 'domesticGuide', label: '发布通告' },
    { value: 'opinionList', label: '征求意见' },
];

const baseUrl = 'https://www.cde.org.cn';
const zdyzMap = {
    zdyz: {
        domesticGuide: {
            title: '发布通告',
            url: `${baseUrl}/zdyz/listpage/2853510d929253719601db17b8a9fd81`,
            endPoint: '/zdyz/getDomesticGuideList',
            form: {
                pageNum: 1,
                pageSize: 10,
                searchTitle: '',
                isFbtg: 1,
                classid: '2853510d929253719601db17b8a9fd81',
                issueDate1: '',
                issueDate2: '',
            },
        },
        opinionList: {
            title: '征求意见',
            url: `${baseUrl}/zdyz/listpage/3c49fad55caad7a034c263cfc2b6eb9c`,
            endPoint: '/zdyz/getOpinionList',
            form: {
                pageNum: 1,
                pageSize: 10,
                searchTitle: '',
                issueDate1: '',
                issueDate2: '',
                fclass: '征求意见',
            },
        },
    },
};

export const route: Route = {
    path: '/zdyz/:category',
    categories: ['government'],
    example: '/cde/zdyz/domesticGuide',
    parameters: { category: { description: '类别，见下表', options: CATEGORY_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '指导原则专栏',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '类别',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category');
    if (!Object.hasOwn(zdyzMap.zdyz, category)) {
        throw new NotFoundError('Invalid CDE guideline category. Use domesticGuide or opinionList.');
    }
    const limit = getRouteLimit(ctx, 10);

    const { data } = await got.post(`${baseUrl}${zdyzMap.zdyz[category].endPoint}`, {
        form: zdyzMap.zdyz[category].form,
        headers: {
            referer: zdyzMap.zdyz[category].url,
            cookie: await utils.getCookie(),
        },
    });

    const records = [...data.data.records];
    const sorted = ctx.req.query('sorted') !== 'false';
    const hasDates = records.every((item) => item.issueDate);
    if (sorted && hasDates) {
        records.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    }
    const selected = !sorted || hasDates ? records.slice(0, limit) : records;
    const list = selected.map((item): DataItem & { link: string } => ({
        title: item.title,
        pubDate: item.issueDate ? timezone(parseDate(item.issueDate), 8) : undefined,
        link: item.externalLinks,
    }));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await got(item.link, {
                    headers: {
                        referer: zdyzMap.zdyz[category].url,
                        cookie: await utils.getCookie(),
                    },
                });
                const $ = load(response.data);
                item.description = $('.new_detail_content').html()! + $('.relatedNews').html()!;
                return item;
            })
        )
    );

    return {
        title: `${zdyzMap.zdyz[category].title} - 国家药品监督管理局药品审评中心`,
        link: zdyzMap.zdyz[category].url,
        item: items,
    };
}
