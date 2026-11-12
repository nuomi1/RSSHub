import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { parseArticle } from './utils';

const TYPE_OPTIONS = [
    { value: 'news', label: '新闻' },
    { value: 'gl', label: '攻略' },
    { value: 'resource', label: '资源' },
];
const TYPE_OPTIONS_DEFAULT = 'news';

export const route: Route = {
    path: '/games/:name/:type?',
    example: '/3dmgame/games/detroitbecomehuman/news',
    parameters: { name: '游戏名字，可以在专题页的 url 中找到', type: { description: '资讯类型，见下表，默认为 `news`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    radar: [
        {
            source: ['3dmgame.com/games/:name/:type'],
        },
    ],
    name: '游戏资讯',
    categories: ['game'],
    maintainers: ['sinchang', 'yangkghjh', 'HenryQW', 'lyqluis'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '资讯类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const { name, type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    const url = `https://www.3dmgame.com/games/${name}/${type}/`;

    const { data: response } = await got(url);
    const $ = load(response);
    const listSelector = type === 'resource' ? $('.ZQ_Left .Llis_4 .lis li, .zq_left .rigtbox7 li').toArray() : $('.ZQ_Left .lis, .zq_left .newsleft li, .zq_left .newlis li').toArray();

    const list = listSelector.map((i) => {
        const $i = $(i);
        const a = $i.find('a[href]').last();
        const time = $i.find('.time, > span');
        return {
            title: a.text(),
            description: $i.find('.miaoshu').text(),
            link: a.attr('href'),
            pubDate: time.length ? parseDate(time.text().trim()) : undefined, // 2020-12-31
        };
    });

    const items = await Promise.all(list.map((item) => parseArticle(item)));

    return {
        title: $('head title').text().split('_', 1)[0],
        description: $('head meta[name="Description"]').attr('content'),
        link: url,
        item: items,
    };
}
