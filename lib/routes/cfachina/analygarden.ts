import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const PROGRAM_OPTIONS = [
    { value: 'ysjsl', label: '有色金属类' },
    { value: 'hsjsl', label: '黑色金属类' },
    { value: 'nyhgl', label: '能源化工类' },
    { value: 'gjsl', label: '贵金属类' },
    { value: 'ncpl', label: '农产品类' },
    { value: 'jrl', label: '金融类' },
    { value: 'zsl', label: '指数类' },
];
const PROGRAM_OPTIONS_DEFAULT = '分析师园地';

export const route: Route = {
    path: '/servicesupport/analygarden/:program?',
    categories: ['other'],
    example: '/cfachina/servicesupport/analygarden',
    parameters: { program: { description: '分类，见下表，留空为全部', options: PROGRAM_OPTIONS, default: PROGRAM_OPTIONS_DEFAULT } },
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
            source: ['cfachina.org/servicesupport/analygarden/:program?', 'cfachina.org/'],
        },
    ],
    name: '分析师园地',
    maintainers: ['TonyRL'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'program',
        description: '分类',
        options: PROGRAM_OPTIONS,
    }),
};

async function handler(ctx) {
    let { program = PROGRAM_OPTIONS_DEFAULT } = ctx.req.param();
    const baseUrl = 'https://www.cfachina.org';
    let pageData,
        pageUrl = `${baseUrl}/servicesupport/analygarden/`;

    if (program !== PROGRAM_OPTIONS_DEFAULT) {
        pageUrl += `${program}/`;

        const response = await got(pageUrl);
        const $ = load(response.data);
        program = $('script:contains("Paging")')
            .text()
            .match(/var name = '(.+)';/)![1];
        pageData = {
            category: $('.crumb a')
                .toArray()
                .map((item) => $(item).text())
                .slice(-2),
        };
    }

    const { data: response } = await got(`${baseUrl}/qx-search/api/wcmSearch/getDataByProgram`, {
        headers: {
            accept: 'application/json, text/plain, */*',
        },
        searchParams: {
            pageNo: 1,
            pageSize: getRouteLimit(ctx, 20),
            keyword: '',
            startTime: '',
            endTime: '',
            type: '',
            programName: program,
        },
    });

    const items = response.data.dataList.map((item) => {
        const link = new URL(item.docPubUrl, baseUrl).href;
        return {
            title: item.docTitle,
            author: item.docAuthor,
            link,
            pubDate: timezone(parseDate(item.operTime), 8),
            enclosure_url: link,
            enclosure_type: `application/${link.split('.').pop()}`,
        };
    });

    return {
        title: `${pageData?.category.toReversed().join(' - ') ?? PROGRAM_OPTIONS_DEFAULT} - 中国期货业协会`,
        link: pageUrl,
        item: items,
    };
}
