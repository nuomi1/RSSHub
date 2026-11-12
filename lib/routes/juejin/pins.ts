import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getShortMsgDescription } from './utils';

const TYPE_OPTIONS = [
    { value: 'recommend', label: '推荐' },
    { value: 'hot', label: '热门' },
    { value: '6824710203301167112', label: '上班摸鱼' },
    { value: '6819970850532360206', label: '内推招聘' },
    { value: '6824710202487472141', label: '一图胜千言' },
    { value: '6824710202562969614', label: '今天学到了' },
    { value: '6824710202378436621', label: '每天一道算法题' },
    { value: '6824710202000932877', label: '开发工具推荐' },
    { value: '6824710203112423437', label: '树洞一下' },
];
const TYPE_OPTIONS_DEFAULT = 'recommend';

export const route: Route = {
    path: '/pins/:type?',
    categories: ['programming'],
    example: '/juejin/pins/6824710202487472141',
    parameters: { type: { description: '默认为 recommend，见下表', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '沸点',
    maintainers: ['xyqfer', 'laampui'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') ?? TYPE_OPTIONS_DEFAULT;
    const title = {
        recommend: '推荐',
        hot: '热门',
        '6824710203301167112': '上班摸鱼',
        '6819970850532360206': '内推招聘',
        '6824710202487472141': '一图胜千言',
        '6824710202562969614': '今天学到了',
        '6824710202378436621': '每天一道算法题',
        '6824710202000932877': '开发工具推荐',
        '6824710203112423437': '树洞一下',
    };

    const isTopic = /^\d+$/.test(type);
    const url = isTopic ? 'https://api.juejin.cn/recommend_api/v1/short_msg/topic' : `https://api.juejin.cn/recommend_api/v1/short_msg/${type}`;
    const json = isTopic ? { id_type: 4, sort_type: 500, cursor: '0', limit: 20, topic_id: type } : { id_type: 4, sort_type: 200, cursor: '0', limit: 20 };

    const response = await ofetch(url, {
        method: 'POST',
        body: json,
    });

    const items = response.data.map((item) => {
        const content = item.msg_Info.content;
        const title = content;
        const guid = item.msg_id;
        const link = `https://juejin.cn/pin/${guid}`;
        const pubDate = parseDate(item.msg_Info.ctime * 1000);
        const author = item.author_user_info.user_name;
        const description = getShortMsgDescription(item.msg_Info);

        return {
            title,
            link,
            description,
            guid,
            pubDate,
            author,
        };
    });

    return {
        title: `沸点 - ${title[type]}`,
        link: 'https://juejin.cn/pins/recommended',
        item: items,
    };
}
