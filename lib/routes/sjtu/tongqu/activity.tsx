import { renderToString } from 'hono/jsx/dom/server';

import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'newest', label: '最新' },
    { value: 'recruitment', label: '招新' },
    { value: 'lecture', label: '讲座' },
    { value: 'outdoors', label: '户外' },
    { value: 'jobs', label: '招聘' },
    { value: 'studyTours', label: '游学' },
    { value: 'competitions', label: '比赛' },
    { value: 'publicWarefare', label: '公益' },
    { value: 'partyDay', label: '主题党日' },
    { value: 'studentAffairs', label: '学生事务' },
    { value: 'ads', label: '广告' },
    { value: 'others', label: '其他' },
];
const TYPE_OPTIONS_DEFAULT = 'all';

const urlRoot = 'https://tongqu.sjtu.edu.cn';

export const route: Route = {
    path: '/tongqu/:type?',
    categories: ['university'],
    example: '/sjtu/tongqu/lecture',
    parameters: { type: { description: '类型，默认为全部', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '同去网最新活动',
    maintainers: ['SeanChao'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'type',
        description: '类型',
        options: TYPE_OPTIONS,
    }),
};

async function handler(ctx) {
    const type = ctx.req.param('type') || TYPE_OPTIONS_DEFAULT;
    const config = {
        all: 0,
        newest: -1,
        recruitment: 9,
        lecture: 2,
        outdoors: 10,
        jobs: 4,
        studyTours: 5,
        competitions: 7,
        publicWarefare: 11,
        partyDay: 13,
        studentAffairs: 14,
        ads: 12,
        others: 8,
    };

    // requests API
    const link = `${urlRoot}/api/act/type?type=${config[type]}&status=0&offset=0&offset=0&number=10&order=act.create_time&desc=true`;
    const response = await got(link);
    const data = response.data;

    // parses data
    const activities = data.result.acts;
    const feeds = activities.map((e) => ({
        title: e.name,
        link: new URL(`/act/${e.actid}`, urlRoot).href,
        category: e.typename,
        description: renderDescription(e),
    }));

    return {
        title: '同去网活动',
        link,
        item: feeds,
    };
}

const renderDescription = (e): string =>
    renderToString(
        <>
            {e.name}
            <br />
            开始时间: {e.sign_start_time}
            <br />
            结束时间: {e.sign_end_time}
            <br />
            地点: {e.location}
            <br />
            报名人数: {e.member_count}/{e.max_member}
            <br />
            来自{e.source}
        </>
    );
