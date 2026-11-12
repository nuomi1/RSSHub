import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: 'prose_poetry', label: '文学' },
    { value: 'fiction', label: '小说' },
    { value: 'history', label: '历史文化' },
    { value: 'biography', label: '社会纪实' },
    { value: 'science', label: '科学新知' },
    { value: 'art', label: '艺术设计' },
    { value: 'business', label: '商业经管' },
    { value: 'comics', label: '绘本漫画' },
];
const TYPE_OPTIONS_DEFAULT = 'all';

const linkUrl = 'https://book.douban.com/latest';
const baseUrl = 'https://m.douban.com/rexxar/api/v2/subject_collection';
const params = 'items?start=0&count=10&mode=collection&for_mobile=1';

export const route: Route = {
    path: '/book/latest/:type?',
    categories: ['social-media'],
    example: '/douban/book/latest/fiction',
    parameters: { type: { description: '专题分类，可选，默认为 `all`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '新书速递',
    maintainers: ['fengkx', 'lyqluis'],
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '专题分类',
        options: TYPE_OPTIONS,
    }),
    handler,
};

const SUBCATS = {
    all: '全部',
    prose_poetry: '文学',
    fiction: '小说',
    history: '历史文化',
    biography: '社会纪实',
    science: '科学新知',
    art: '艺术设计',
    business: '商业经管',
    comics: '绘本漫画',
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    const subUrl = `new_book_${type}`;
    const url = `${baseUrl}/${subUrl}/${params}`;

    const res = await got.get(url);
    const items = res.data.items;

    return {
        title: `豆瓣新书速递${type === TYPE_OPTIONS_DEFAULT ? '' : '-' + SUBCATS[type]}`,
        link: `${linkUrl}${type === TYPE_OPTIONS_DEFAULT ? '' : '?subcat=' + SUBCATS[type]}`,
        item: items.map(({ title, url, card_subtitle, cards, pic, rating, null_rating_reason }) => {
            const rate = rating.value ? `${rating.value}分` : null_rating_reason;
            const img = `<img src="${pic.normal}">`;
            const info = card_subtitle;
            const description = `${img}<br>${info}<br><br>${cards[0]?.content ?? ''}<br><br>${rate}`;

            return {
                title,
                description,
                link: url,
            };
        }),
    };
}
