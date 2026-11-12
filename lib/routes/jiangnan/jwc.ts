import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TYPE_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'tzgg', label: '通知公告' },
    { value: 'ksap', label: '考试安排' },
    { value: 'wjgg', label: '违纪公告' },
    { value: 'tmgz', label: '推免工作' },
    { value: 'djks', label: '等级考试' },
    { value: 'xjgl', label: '学籍管理' },
    { value: 'bysj', label: '毕业设计' },
    { value: 'syjx', label: '实验教学' },
    { value: 'sjcx', label: '实践创新' },
    { value: 'xkjs', label: '学科竞赛' },
    { value: 'yjszj', label: '研究生助教' },
    { value: 'jxgg', label: '教学改革' },
    { value: 'zyjs', label: '专业建设' },
    { value: 'kcjs', label: '课程建设' },
    { value: 'jcjs', label: '教材建设' },
    { value: 'jxcg', label: '教学成果' },
    { value: 'xsbg', label: '学术报告' },
];
const TYPE_OPTIONS_DEFAULT = 'all';

async function getOptionalPublicationDate(link: string): Promise<Date | undefined> {
    try {
        return await getPublicationDate(link);
    } catch {
        // The original route retains listing metadata if the dedicated date lookup fails.
        return;
    }
}

const baseUrl = 'https://jwc.jiangnan.edu.cn';

const map = {
    all: '/',
    tzgg: '/jwgl/tzgg.htm',
    ksap: '/jwgl/ksap.htm',
    wjgg: '/jwgl/wjgg.htm',
    tmgz: '/jwgl/tmgz.htm',
    djks: '/jwgl/djks.htm',
    xjgl: '/xjgl1.htm',
    bysj: '/sjjx/bysj.htm',
    syjx: '/sjjx/syjx.htm',
    sjcx: '/sjjx/sjcx.htm',
    xkjs: '/sjjx/xkjs.htm',
    yjszj: '/sjjx/yjszj.htm',
    jxgg: '/jxjs/jxgg.htm',
    zyjs: '/jxjs/zyjs.htm',
    kcjs: '/jxjs/kcjs.htm',
    jcjs: '/jxjs/jcjs.htm',
    jxcg: '/jxjs/jxcg.htm',
    xsbg: '/xsbg.htm',
};

export const route: Route = {
    path: '/jwc/:type?',
    categories: ['university'],
    example: '/jiangnan/jwc/all',
    parameters: { type: { description: '默认为 `all`', options: TYPE_OPTIONS, default: TYPE_OPTIONS_DEFAULT } },
    name: '教务处通知',
    maintainers: ['fuzy112'],
    features: { antiCrawler: true },
    description: renderOptionsMarkdownTable({ parameter: 'type', description: '类型', options: TYPE_OPTIONS }),
    handler,
};

const getPublicationDate = (link: string) =>
    cache.tryGet(`jiangnan:publication:${link}`, async () => {
        const html = await ofetch(link);
        const $ = load(html);
        const date = $('form[name="_newscontent_fromname"] .zw-other')
            .text()
            .match(/时间[：:]\s*(\d{4}-\d{2}-\d{2})/)?.[1];
        return date ? parseDate(`${date}T00:00:00+08:00`) : undefined;
    });

async function handler(ctx: Context) {
    const { type = TYPE_OPTIONS_DEFAULT } = ctx.req.param();
    if (!Object.hasOwn(map, type)) {
        throw new InvalidParameterError(`Unknown notice category: ${type}. Choose ${Object.keys(map).join(', ')}.`);
    }
    const link = `${baseUrl}${map[type]}`;

    const response = await ofetch(link, {
        headers: {
            Referer: link,
        },
    });

    const $ = load(response);

    const items = $('.pg-list>ul>li')
        .slice(0, 10)
        .toArray()
        .map((elem): DataItem | null => {
            const title = $('a', elem).attr('title');
            if (!title) {
                return null;
            }
            return {
                link: new URL($('a', elem).attr('href')!, link).href,
                title,
            };
        })
        .filter((item) => item !== null);

    const datedItems = await pMap(
        items,
        async (item) => ({
            ...item,
            // An unavailable full date must not turn a month/day into a guessed year.
            pubDate: await getOptionalPublicationDate(item.link!),
        }),
        { concurrency: 3 }
    );

    return {
        link,
        title: $('title').text(),
        item: datedItems,
    };
}
