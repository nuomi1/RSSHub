import { load } from 'cheerio';
import iconv from 'iconv-lite';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';
import { isValidHost } from '@/utils/valid-host';

const CITY_OPTIONS = [
    { value: 'www', label: '杭州' },
    { value: 'taizhou', label: '台州' },
    { value: 'jiaxing', label: '嘉兴' },
    { value: 'ningbo', label: '宁波' },
    { value: 'huzhou', label: '湖州' },
    { value: 'shaoxing', label: '绍兴' },
    { value: 'wenzhou', label: '温州' },
    { value: 'jinhua', label: '金华' },
    { value: 'zhoushan', label: '舟山' },
    { value: 'quzhou', label: '衢州' },
    { value: 'lishui', label: '丽水' },
    { value: 'yiwu', label: '义乌' },
    { value: 'xiaoshan', label: '萧山' },
    { value: 'yuhang', label: '余杭' },
    { value: 'linan', label: '临安' },
    { value: 'fuyang', label: '富阳' },
    { value: 'tonglu', label: '桐庐' },
    { value: 'jiande', label: '建德' },
    { value: 'chunan', label: '淳安' },
];
const CITY_OPTIONS_DEFAULT = 'www';

const setCookie = function (cookieName, cookieValue, seconds, path, domain, secure?) {
    let expires: Date | null = null;
    if (seconds !== -1) {
        expires = new Date();
        expires.setTime(expires.getTime() + seconds);
    }
    return [encodeURI(cookieName), '=', encodeURI(cookieValue), expires ? '; expires=' + expires.toUTCString() : '', path ? '; path=' + path : '/', domain ? '; domain=' + domain : '', secure ? '; secure' : ''].join('');
};

export const route: Route = {
    path: '/:city?',
    categories: ['bbs'],
    example: '/19lou/jiaxing',
    parameters: { city: { description: '分类，见下表，默认为 www，即杭州', options: CITY_OPTIONS, default: CITY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '头条',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'city',
        description: '分类',
        options: CITY_OPTIONS,
    }),
};

async function handler(ctx) {
    const city = ctx.req.param('city') ?? CITY_OPTIONS_DEFAULT;
    if (!isValidHost(city)) {
        throw new InvalidParameterError('Invalid city');
    }

    const rootUrl = `https://${city}.19lou.com`;

    const response = await got({
        method: 'get',
        url: rootUrl,
        responseType: 'buffer',
    });

    const $ = load(iconv.decode(response.data, 'gbk'));

    $('.title-more').remove();

    let items = $('.center-center-jiazi')
        .find('a[title]')
        .toArray()
        .map((item): DataItem & { link: string } => {
            const $item = $(item);

            return {
                title: $item.attr('title')!,
                link: `https:${$item.attr('href')}`,
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                    responseType: 'buffer',
                    headers: {
                        cookie: setCookie('_Z3nY0d4C_', '37XgPK9h', 365, '/', '19lou.com'),
                        referer: rootUrl,
                    },
                });

                const content = load(iconv.decode(detailResponse.data, 'gbk'));

                content('.name-lz, .postView-pk-mod').remove();

                item.author = content('.uname, .user-name').first().text();
                item.description = content('.post-cont').first().html() || content('.thread-cont').html();
                item.pubDate = timezone(parseDate(content('.cont-top-left meta').attr('content')!), 8);

                return item;
            })
        )
    );

    return {
        title: $('title').text().split('-', 1)[0],
        link: rootUrl,
        item: items,
    };
}
