import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const REGION_OPTIONS = [
    { value: 'cn', label: '中国 / 大陆' },
    { value: 'kr', label: '대한민국' },
    { value: 'eu', label: 'Europe' },
    { value: 'us', label: 'United States' },
    { value: 'ru', label: 'Russia' },
    { value: 'en', label: 'Global' },
];
const REGION_OPTIONS_DEFAULT = 'en';

const TYPE_OPTIONS = [
    { value: 'news', label: '新闻' },
    { value: 'blog', label: '博客' },
];
const TYPE_OPTIONS_DEFAULT = 'news';

export const route: Route = {
    path: '/:region{(?:cn|kr|eu|us|ru|en)}/:type?',
    categories: ['other'],
    example: '/aqara/en/news',
    parameters: {
        region: { description: '地区 id，可在对应新闻页 URL 中找到，默认为 en，即 Global', options: REGION_OPTIONS, default: REGION_OPTIONS_DEFAULT },
        type: { description: '类型，见下表，默认为 news，即新闻', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT },
    },
    description: `${renderOptionsMarkdownTable({
        parameter: 'region',
        description: '地区 id',
        options: REGION_OPTIONS,
    })}

${renderOptionsMarkdownTable({
    parameter: 'type',
    description: '类型',
    options: TYPE_OPTIONS,
})}`,
    name: '新闻、博客',
    maintainers: ['nczitzk'],
    handler,
};

const types = {
    news: 'news',
    blog: 'blog',
};

function handler(ctx) {
    const { region = REGION_OPTIONS_DEFAULT, type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(types, type)) {
        throw new InvalidParameterError('Invalid Aqara content type. Use news or blog.');
    }
    const redirectTo = `/aqara/${region}/category/${types[type]}`;
    return ctx.set('redirect', redirectTo);
}
