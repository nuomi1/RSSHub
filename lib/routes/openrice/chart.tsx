import { load } from 'cheerio';
import { renderToString } from 'hono/jsx/dom/server';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const LANG_OPTIONS = [
    { value: 'zh-cn', label: '简体' },
    { value: 'zh', label: '繁體' },
    { value: 'en', label: 'EN' },
];
const LANG_OPTIONS_DEFAULT = 'zh';

const CATEGORY_OPTIONS = [
    { value: 'most-bookmarked', label: '最多收藏' },
    { value: 'best-rating', label: '每周最高评分' },
    { value: 'most-popular', label: '最高浏览' },
    { value: 'best-dessert', label: '最佳甜品餐厅' },
];
const CATEGORY_OPTIONS_DEFAULT = 'most-bookmarked';

const baseUrl = 'https://www.openrice.com';

export const route: Route = {
    path: '/:lang/hongkong/explore/chart/:category',
    maintainers: ['after9'],
    handler,
    categories: ['shopping'],
    example: '/openrice/zh/hongkong/explore/chart/most-bookmarked',
    parameters: {
        lang: { description: '语言，缺省为 zh', options: LANG_OPTIONS, default: LANG_OPTIONS_DEFAULT },
        category: { description: '类别，缺省为 most-bookmarked', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT },
    },
    name: '香港餐廳排行榜',
    description: `${renderOptionsMarkdownTable({
        parameter: 'lang',
        description: '语言',
        options: LANG_OPTIONS,
    })}

${renderOptionsMarkdownTable({
    parameter: 'category',
    description: '类别',
    options: CATEGORY_OPTIONS,
})}`,
};

async function handler(ctx) {
    const lang = ctx.req.param('lang') ?? LANG_OPTIONS_DEFAULT;
    const category = ctx.req.param('category') ?? CATEGORY_OPTIONS_DEFAULT;

    const urlPath = `/${lang}/hongkong/explore/chart/${category}`;
    const response = await ofetch(baseUrl + urlPath);
    const $ = load(response);

    const title = $('title').text() ?? 'Hong Kong Restaurant Chart';
    const description = $('title').text() ?? 'Hong Kong Restaurant Chart';

    const data = $('.poi-chart-main-grid-item-desktop-wrapper');
    const resultList = data.toArray().map((item) => {
        const $item = $(item);
        const rankClass = $item.find('.rank-icon').attr('class');
        const rankNumber = rankClass?.match(/rank-(\d+)/)?.[1] ?? '';
        const desTags = $item.find('.pcmgidtr-left-section-poi-info-details .pcmgidtrls-poi-info-details-text');
        const desTagsArray: string[] = desTags.toArray().map((tag) => $(tag).text());
        const title = $item.find('.pcmgidtr-left-section-poi-info-name .link').text() ?? '';
        const link = $item.find('.pcmgidtr-left-section-poi-info-name .link').attr('href') ?? '';
        const coverImg = $item.find('.pcmgidtr-left-section-door-photo img').attr('src') ?? null;
        const description = renderToString(
            <>
                <h3>{`Rank: ${rankNumber}`}</h3>
                <p>{desTagsArray.join(' ')}</p>
                {coverImg ? <img src={coverImg} /> : null}
            </>
        );
        return {
            title,
            description,
            link,
        };
    });

    return {
        title,
        link: baseUrl + urlPath,
        description,
        item: resultList,
    };
}
