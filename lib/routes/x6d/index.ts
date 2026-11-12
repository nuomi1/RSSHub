import { load } from 'cheerio';
import pMap from 'p-map';

import NotFoundError from '@/errors/types/not-found';
import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const ID_OPTIONS = [
    { value: '31', label: '技巧分享' },
    { value: '55', label: 'QQ 技巧' },
    { value: '112', label: '微信技巧' },
    { value: '33', label: '其他教程' },
    { value: '88', label: '其他分享' },
    { value: '18', label: '宅家自学' },
    { value: '98', label: '健身养生' },
    { value: '94', label: '摄影剪辑' },
    { value: '93', label: '长点知识' },
    { value: '99', label: '自我提升' },
    { value: '100', label: '两性相关' },
    { value: '21', label: '编程办公' },
    { value: '22', label: '职场关系' },
    { value: '19', label: '新媒体运营' },
    { value: '44', label: '其他教程' },
    { value: '34', label: '活动线报' },
    { value: '35', label: '流量话费' },
    { value: '91', label: '免费会员' },
    { value: '92', label: '实物活动' },
    { value: '39', label: '游戏活动' },
    { value: '38', label: '红包活动' },
    { value: '37', label: '空间域名' },
    { value: '36', label: '其他活动' },
    { value: '65', label: '值得一看' },
    { value: '50', label: '找点乐子' },
    { value: '77', label: '热门事件' },
    { value: '101', label: '节目推荐' },
    { value: '71', label: '值得一听' },
    { value: '87', label: '每日一听' },
    { value: '79', label: '歌单推荐' },
    { value: '106', label: '资源宝库' },
    { value: '107', label: '书籍资料' },
    { value: '108', label: '设计资源' },
    { value: '109', label: '剪辑资源' },
    { value: '110', label: '办公资源' },
    { value: '111', label: '壁纸资源' },
    { value: '113', label: '编程资源' },
];
const ID_OPTIONS_DEFAULT = 'latest';

export const route: Route = {
    path: '/:id?',
    name: '分类',
    url: 'xd.x6d.com',
    maintainers: ['nczitzk'],
    handler,
    example: '/x6d/34',
    parameters: { id: { description: '分类 id，可在对应分类页面的 URL 中找到，默认为首页最近更新', options: ID_OPTIONS, default: ID_OPTIONS_DEFAULT } },
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '分类 id',
        options: ID_OPTIONS,
    }),
    categories: ['new-media'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
};
const rootUrl = 'https://xd.x6d.com';
async function fetchDetail(link: string): Promise<Pick<DataItem, 'description' | 'pubDate' | 'category' | 'author' | 'content' | 'image' | 'banner'>> {
    const { data: detailResponse } = await got(link);
    const $ = load(detailResponse);
    const description = $('div.article-content').html();
    const imageSrc = $('div.article-content img').first().attr('src');
    const image = imageSrc ? new URL(imageSrc, rootUrl).href : undefined;
    const rawDate = $('time').text();
    const pubDate = rawDate ? timezone(parseDate(rawDate, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD'], true), 8) : undefined;
    return {
        description,
        pubDate: pubDate && Number.isFinite(pubDate.getTime()) ? pubDate : undefined,
        category: $('b.bq-wg')
            .toArray()
            .map((element) => $(element).text()),
        author: $('span.bq-zz').text(),
        content: { html: description, text: $('div.article-content').text() },
        image,
        banner: image,
    };
}
export async function handler(ctx) {
    const { id = 'latest' } = ctx.req.param();
    const requestedLimit = Number(ctx.req.query('limit') ?? '22');
    const limit = Number.isFinite(requestedLimit) && requestedLimit >= 1 ? Math.floor(requestedLimit) : 22;
    let currentUrl = new URL(id === 'latest' ? '' : `html/${id}.html`, rootUrl).href;
    const { data: firstResponse } = await got(currentUrl);
    let $;
    if (/<meta\s/.test(firstResponse)) {
        $ = load(firstResponse);
    } else {
        const redirectParts = id === 'latest' ? [] : firstResponse.match(/'([\w./=?]+)'/g);
        if (!redirectParts) {
            throw new NotFoundError('Could not resolve the category redirect from the source page');
        }
        currentUrl = new URL(id === 'latest' ? '' : redirectParts.toReversed().join('').replaceAll("'", ''), rootUrl).href;
        const { data: response } = await got(currentUrl);
        $ = load(response);
    }
    $('i.rj').remove();
    const language = 'zh' as const satisfies Language;
    const query = id === 'latest' ? $('#newslist ul').first().find('li').not('li.addd').find('a').slice(0, limit) : $('a.soft-title').slice(0, limit);
    let items: Array<
        DataItem & {
            link: string;
        }
    > = query
        .toArray()
        .filter((item) => $(item).attr('href'))
        .map((item) => {
            const $item = $(item);
            return {
                title: $item.prop('title') ?? $item.text(),
                link: new URL($item.prop('href'), rootUrl).href,
                language,
            };
        });
    items = await pMap(
        items,
        (item) =>
            mapResolvedValue(
                cache.tryGet(`x6d:detail:v4:${item.link}`, () => fetchDetail(item.link)),
                (detail) => ({
                    ...item,
                    description: detail.description,
                    pubDate: detail.pubDate,
                    category: detail.category,
                    author: detail.author,
                    content: detail.content,
                    image: detail.image,
                    banner: detail.banner,
                })
            ),
        { concurrency: 3, stopOnError: false }
    );
    const imageSrc = $('div.header-logo img').attr('src');
    const image = imageSrc ? new URL(imageSrc, rootUrl).href : undefined;
    return {
        title: $('title').text().split(/\s-/, 1)[0],
        description: $('meta[name="description"]').prop('content'),
        link: currentUrl,
        item: items,
        image,
        language,
    };
}
async function mapResolvedValue<T, U>(promise: Promise<T>, mapper: (value: T) => U | Promise<U>): Promise<U> {
    const value = await promise;
    return mapper(value);
}
