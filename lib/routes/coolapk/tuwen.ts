import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import utils from './utils';

const TYPE_OPTIONS = [
    { value: 'type', label: '参数名称' },
    { value: 'hot', label: '编辑精选' },
    { value: 'latest', label: '最新' },
];
const TYPE_OPTIONS_DEFAULT = 'hot';

export const route: Route = {
    path: '/tuwen/:type?',
    categories: ['social-media'],
    example: '/coolapk/tuwen',
    parameters: { type: { description: '默认为hot', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: [
            {
                name: 'ALLOW_USER_HOTLINK_TEMPLATE',
                optional: true,
                description: '设置为`true`并添加`image_hotlink_template`参数来代理图片',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '图文',
    maintainers: ['xizeyoupan'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') || TYPE_OPTIONS_DEFAULT;
    if (!['hot', 'latest'].includes(type)) {
        throw new InvalidParameterError('Invalid article type. Use hot or latest.');
    }
    let feedTitle;
    const fullUrl = new URL('/v6/page/dataList', utils.base_url);
    if (type === 'latest') {
        // 实时
        fullUrl.searchParams.append('url', `/feed/digestList?${new URLSearchParams('cacheExpires=300&type=12&message_status=all&is_html_article=1&filterEmptyPicture=1&filterTag=二手交易,酷安自贸区,薅羊毛小分队').toString()}`);
        fullUrl.searchParams.append('title', '新鲜图文');
        fullUrl.searchParams.append('subTitle', '');
        feedTitle = '酷安 - 新鲜图文';
    } else {
        // 精选
        fullUrl.searchParams.append('url', `#/feed/digestList?${new URLSearchParams('type=12&is_html_article=1&recommend=3,4').toString()}`);
        fullUrl.searchParams.append('title', '图文');

        feedTitle = '酷安图文 - 编辑精选';
    }
    fullUrl.searchParams.append('page', '1');

    const response = await got(fullUrl, {
        headers: utils.getHeaders(),
    });
    const data = response.data.data;

    const out = await Promise.all(utils.selectDynamics(data).map((item) => utils.parseDynamic(item)));

    return {
        title: feedTitle,
        link: 'https://www.coolapk.com/',
        description: feedTitle,
        item: out.filter(Boolean),
    };
}
