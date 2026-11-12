import { load } from 'cheerio';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const rootUrl = 'https://www.hellobtc.com';

const channelSelector = {
    latest: 'div.index_tabs_container.js-tabs-container > div:nth-child(1)',
    bitcoin: 'div.index_tabs_container.js-tabs-container > div:nth-child(2)',
    ethereum: 'div.index_tabs_container.js-tabs-container > div:nth-child(3)',
    defi: 'div.index_tabs_container.js-tabs-container > div:nth-child(4)',
    inter_blockchain: 'div.index_tabs_container.js-tabs-container > div:nth-child(5)',
    mining: 'div.index_tabs_container.js-tabs-container > div:nth-child(6)',
    safety: 'div.index_tabs_container.js-tabs-container > div:nth-child(7)',
    satoshi_nakamoto: 'div.index_tabs_container.js-tabs-container > div:nth-child(8)',
    public_blockchain: 'div.index_tabs_container.js-tabs-container > div:nth-child(9)',
};

const titleMap = {
    latest: '最新',
    bitcoin: '比特币',
    ethereum: '以太坊',
    defi: 'DeFi',
    inter_blockchain: '跨链',
    mining: '挖矿',
    safety: '安全',
    satoshi_nakamoto: '中本聪',
    public_blockchain: '公链',
};

const CHANNEL_OPTIONS = Object.entries(titleMap).map(([value, label]) => ({ value, label }));
const CHANNEL_OPTIONS_DEFAULT = 'latest';

export const route: Route = {
    path: '/kepu/:channel?',
    categories: ['new-media'],
    example: '/hellobtc/kepu/latest',
    parameters: { channel: { description: '类型，见下表，默认为最新', options: CHANNEL_OPTIONS, default: CHANNEL_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '科普',
    maintainers: ['Fatpandac'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'channel',
        description: '类型',
        options: CHANNEL_OPTIONS,
    }),
};

async function handler(ctx) {
    const parameter = ctx.req.param('channel') ?? CHANNEL_OPTIONS_DEFAULT;
    const channel = parameter === 'satoshi_nakomoto' ? 'satoshi_nakamoto' : parameter;
    if (!Object.hasOwn(channelSelector, channel)) {
        throw new InvalidParameterError(`Invalid channel: ${parameter}. Supported channels: ${Object.keys(channelSelector).join(', ')}.`);
    }
    const url = `${rootUrl}/kepu.html`;

    const response = await got(url);
    const $ = load(response.data);
    const list = $(channelSelector[channel])
        .find('div.new_item')
        .toArray()
        .map((item): DataItem => ({
            title: $(item).find('a').text(),
            link: $(item).find('a').attr('href'),
        }));

    const items = await pMap(
        list,
        (item) =>
            cache.tryGet(item.link!, async () => {
                const detailResponse = await got(item.link);
                const content = load(detailResponse.data);

                const published = detailResponse.data.match(/\bvar\s+ct\s*=\s*["'](\d+)["']/)?.[1];
                item.pubDate = published ? parseDate(published, 'X') : undefined;
                item.description = content('#js_content')
                    .html()!
                    .replaceAll(/(<img.*?)data-src(.*?>)/g, '$1src$2');

                return item;
            }),
        { concurrency: 3 }
    );

    return {
        title: `白话区块链 - 科普 ${titleMap[channel]}`,
        link: url,
        item: items,
    };
}
