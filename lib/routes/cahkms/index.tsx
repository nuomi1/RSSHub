import { raw } from 'hono/html';
import { renderToString } from 'hono/jsx/dom/server';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';
import timezone from '@/utils/timezone';

const titles = {
    '01': '关于我们',
    '02': '港澳新闻',
    '03': '重要新闻',
    '04': '顾问点评、会员观点',
    '05': '专题汇总',
    '06': '港澳时评',
    '07': '图片新闻',
    '08': '视频中心',
    '09': '港澳研究',
    '10': '最新书讯',
    '11': '研究资讯',
};

const CATEGORY_OPTIONS = Object.entries(titles).map(([value, label]) => ({ value, label }));
const CATEGORY_OPTIONS_DEFAULT = '03';

export const route: Route = {
    path: '/:category?',
    categories: ['new-media'],
    example: '/cahkms',
    parameters: { category: { description: '分类，见下表，默认为重要新闻', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
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
            source: ['cahkms.org/'],
        },
    ],
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
    url: 'cahkms.org/',
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const rootUrl = 'http://www.cahkms.org';
    const webpageUrl = `${rootUrl}/HKMAC/webView/mc/AboutUs_1.html`;
    const currentUrl = `${rootUrl}/HKMAC/indexMac/getRightList?dm=${category}&page=1&countPage=${getRouteLimit(ctx, 10)}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    let items = response.data
        .filter((item) => item.ID)
        .map((item) => ({
            id: item.ID,
            title: item.TITLE,
            description: `<p>${item.GJZ}</p>`,
            pubDate: timezone(parseDate(item.JDRQ), 8),
            link: `${rootUrl}/HKMAC/indexMac/getWzxx?id=${item.ID}`,
        }));

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                item.author = detailResponse.data.WZLY;
                const video = detailResponse.data.VIDEO.indexOf('.mp4') > 0 ? detailResponse.data.VIDEO : null;
                const imageUrl = detailResponse.data.URL ? new URL(detailResponse.data.URL, `${rootUrl}/`).href : undefined;
                item.description = renderToString(
                    <>
                        {imageUrl && !video ? <img src={imageUrl} /> : null}
                        {detailResponse.data.CONTENT ? raw(detailResponse.data.CONTENT) : null}
                        {video ? (
                            <video controls poster={imageUrl}>
                                <source src={new URL(video, `${rootUrl}/`).href} type="video/mp4" />
                            </video>
                        ) : null}
                        {detailResponse.data.fjlist?.length ? (
                            <>
                                <br />
                                <b>下载附件：</b>
                                <br />
                                {detailResponse.data.fjlist.map((file) => (
                                    <>
                                        <a href={new URL(file.URL, `${rootUrl}/`).href}>{file.FJMC}</a>
                                        <br />
                                    </>
                                ))}
                            </>
                        ) : null}
                    </>
                );
                const { id, ...article } = item;
                article.link = `${webpageUrl}?${category === '05' ? 'zthz05' : category}&${titles[category]}&${id}`;

                return article;
            })
        )
    );

    return {
        title: `${titles[category]} - 全国港澳研究会`,
        link: `${webpageUrl}?${category}&${titles[category]}`,
        item: items,
    };
}
