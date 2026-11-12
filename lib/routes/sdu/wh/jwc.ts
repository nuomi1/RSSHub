import { load } from 'cheerio';
import pMap from 'p-map';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

import data from '../data';
import extractor from '../extractor';

const COLUMN_OPTIONS = [
    { value: 'gzzd', label: '规章制度' },
    { value: 'zyjs', label: '专业建设' },
    { value: 'sjjx', label: '实践教学' },
    { value: 'zbfc', label: '支部风采' },
    { value: 'fwzn', label: '服务指南' },
    { value: 'jwyw', label: '教务要闻' },
    { value: 'gztz', label: '工作通知' },
    { value: 'jwjb', label: '教务简报' },
    { value: 'cyxz', label: '常用下载' },
];
const COLUMN_OPTIONS_DEFAULT = 'gztz';

export const route: Route = {
    path: '/wh/jwc/:column?',
    categories: ['university'],
    example: '/sdu/wh/jwc/gztz',
    parameters: { column: { description: '专栏名称，默认为工作通知（`gztz`）', options: COLUMN_OPTIONS, default: COLUMN_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处',
    maintainers: ['kxxt'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'column',
        description: '专栏名称',
        options: COLUMN_OPTIONS,
    }),
};

type ExtractedArticle = {
    description?: string | null;
    author?: string;
    exactDate?: Date;
};

async function handler(ctx) {
    const column = ctx.req.param('column') ?? COLUMN_OPTIONS_DEFAULT;
    const baseUrl = data.wh.jwc.url;
    const response = await got(baseUrl + data.wh.jwc.columns[column].url);
    const $ = load(response.data);
    const items = $('.articleul li');
    const out = await pMap(
        items.toArray(),
        async (item, _index) => {
            const $item = $(item);
            const anchor = $item.find('a');
            const dateElement = $item.find('div:last-of-type');
            const dateText = dateElement.text();
            dateElement.remove();
            const href = anchor.attr('href');
            const link = href!.startsWith('http') ? href : baseUrl + href;
            const title = $item.text();
            const { description, author: exactAuthor, exactDate } = await cache.tryGet<ExtractedArticle>(link!, () => extractor(link));
            const author = exactAuthor ?? '教务处';
            const pubDate = exactDate ?? timezone(parseDate(dateText.slice(1, -1), 'YYYY-MM-DD'), 8);
            return {
                title,
                link,
                description,
                pubDate,
                author,
            };
        },
        { concurrency: 3 }
    );

    return {
        title: `${data.wh.jwc.name} ${data.wh.jwc.columns[column].name}`,
        link: baseUrl + data.wh.jwc.columns[column].url,
        item: out,
    };
}
