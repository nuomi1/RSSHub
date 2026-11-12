import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const LANGUAGE_OPTIONS = [
    { value: 'zh-hans', label: '简体中文' },
    { value: 'zh-hant', label: '繁体中文' },
];
const LANGUAGE_OPTIONS_DEFAULT = 'zh-hans';

export const route: Route = {
    path: '/news/:language?',
    categories: ['new-media'],
    example: '/kaopu/news/zh-hans',
    parameters: {
        language: { description: '语言', options: LANGUAGE_OPTIONS, default: LANGUAGE_OPTIONS_DEFAULT },
    },
    radar: [
        {
            source: ['kaopu.news/'],
        },
    ],
    name: '全部',
    maintainers: ['fashioncj'],
    description: renderOptionsMarkdownTable({
        parameter: 'language',
        description: '语言',
        options: LANGUAGE_OPTIONS,
    }),
    handler,
};

async function handler(ctx) {
    const { language = LANGUAGE_OPTIONS_DEFAULT } = ctx.req.param();

    if (!['zh-hans', 'zh-hant'].includes(language)) {
        throw new InvalidParameterError(`Unknown kaopu language: ${language}. Use a documented language code.`);
    }

    const rootUrl = 'https://kaopu.news';
    const currentUrl = `${rootUrl}/${language === 'zh-hant' ? 'zh-hant' : 'index'}.html`;
    // API PATH: https://kaopucdn.azureedge.net/jsondata/news_list_beta_hans_0.json
    const apiUrl = `https://kaopustorage.blob.core.windows.net/jsondata/news_list_beta_han${language === 'zh-hant' ? 't' : 's'}_0.json`;

    const response = await got({
        method: 'get',
        url: apiUrl,
    });

    const items = response.data.map((item) => ({
        link: item.link,
        title: item.title,
        author: item.publisher,
        pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
        description: `<p>${item.description}</p>`,
    }));

    return {
        title: language === 'zh-hant' ? '靠譜新聞' : '靠谱新闻',
        link: currentUrl,
        item: items,
    };
}
