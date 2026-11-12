import querystring from 'node:querystring';

import type { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const CATEGORY_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'course', label: '选课' },
    { value: 'exam', label: '考试' },
    { value: 'practice', label: '实践' },
    { value: 'communication', label: '交流' },
    { value: 'teacher', label: '教师' },
    { value: 'info', label: '信息' },
];
const CATEGORY_OPTIONS_DEFAULT = 'all';

const baseUrl = 'http://jw.scut.edu.cn';
const refererUrl = baseUrl + '/dist/';

const listPageUrl = baseUrl + '/zhinan/cms/toPosts.do';
const listApiUrl = baseUrl + '/zhinan/jw/api/v2/findInformNotice.do';
const articleApiUrl = baseUrl + '/zhinan/jw/api/v2/getArticleInfo.do';

const getArticleUrlById = (id) => `${baseUrl}/zhinan/cms/article/view.do?type=posts&id=${id}`;
const getArticleMobileUrlById = (id) => `${baseUrl}/dist/#/detail/index?id=${id}&type=notice`;

const categoryMap = {
    all: { title: '全部', tag: '0' },
    course: { title: '选课', tag: '1' },
    exam: { title: '考试', tag: '2' },
    practice: { title: '实践', tag: '3' },
    communication: { title: '交流', tag: '4' },
    teacher: { title: '教师', tag: '5' },
    info: { title: '信息', tag: '6' },
};

const generateArticlePubDate = (createDateStr) => {
    const date = new Date(createDateStr);
    date.setHours(8);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return timezone(date, 8);
};

const isRedirectPage = (data) => !!data.link;

const resolveRelativeUrl = (html) => html.replaceAll('src="/', () => `src="${new URL('.', baseUrl).href}`).replaceAll('href="/', () => `href="${new URL('.', baseUrl).href}`);

const apiSuccessAssert = (data) => {
    if (!data.success) {
        throw new Error('article api error');
    }
};

const generateArticleLink = (id) => `<p>链接：<a href="${getArticleUrlById(id)}">电脑版</a>&nbsp;|&nbsp;<a href="${getArticleMobileUrlById(id)}">手机版</a></p>`;

const generateArticleFullText = (data) => resolveRelativeUrl(data.content) + generateArticleLink(data.id);

export const route: Route = {
    path: '/jwc/notice/:category?',
    categories: ['university'],
    example: '/scut/jwc/notice/all',
    parameters: { category: { description: '通知分类，默认为 `all`', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处通知公告',
    maintainers: ['imkero'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '通知分类',
        options: CATEGORY_OPTIONS,
    }),
};

async function handler(ctx) {
    const categoryName = ctx.req.param('category') || CATEGORY_OPTIONS_DEFAULT;
    const categoryMeta = categoryMap[categoryName];

    const qs = querystring.stringify({
        pageNo: 1,
        pageSize: 20,
        tag: categoryMeta.tag,
    });

    const listApiResponse = await got({
        method: 'post',
        url: `${listApiUrl}?${qs}`,
        headers: {
            Referer: refererUrl,
        },
    });
    apiSuccessAssert(listApiResponse.data);

    const articleMetaArray = listApiResponse.data.data.list;
    const out = await Promise.all(
        articleMetaArray.map(async (articleMeta) => {
            const articleUrl = getArticleUrlById(articleMeta.id);

            const cacheIn = await cache.get(articleUrl);
            if (cacheIn) {
                return JSON.parse(cacheIn);
            }

            const qs = querystring.stringify({
                id: articleMeta.id,
                categoryType: '',
            });
            const articleApiResponse = await got({
                method: 'post',
                url: `${articleApiUrl}?${qs}`,
                headers: {
                    Referer: refererUrl,
                },
            });
            apiSuccessAssert(articleApiResponse.data);

            const articleData = articleApiResponse.data.data;
            articleData.id = articleMeta.id;

            let articleFullText: string | null = null;
            if (!isRedirectPage(articleData)) {
                articleFullText = generateArticleFullText(articleData);
            }

            const item = {
                title: articleData.name,
                link: articleUrl,
                description: articleFullText,
                pubDate: generateArticlePubDate(articleData.createDate).toUTCString(),
            };

            cache.set(articleUrl, JSON.stringify(item));
            return item;
        })
    );

    return {
        title: '华南理工大学教务处通知公告 - ' + categoryMeta.title,
        link: listPageUrl,
        item: out,
    };
}
