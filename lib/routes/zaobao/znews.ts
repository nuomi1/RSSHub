import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { logo, parseList } from './util';

const SECTION_OPTIONS = [
    { value: 'china', label: '中国' },
    { value: 'singapore', label: '新加坡' },
    { value: 'sea', label: '东南亚' },
    { value: 'world', label: '国际' },
    { value: 'sports', label: '体育' },
];

const baseUrl = 'https://www.zaobao.com';

export const route: Route = {
    path: '/znews/:section?',
    categories: ['traditional-media'],
    example: '/zaobao/znews/china',
    parameters: { section: { description: '分类，缺省为 china', options: SECTION_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '新闻',
    maintainers: ['shunf4'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'section',
        description: '分类',
        options: SECTION_OPTIONS,
    }),
};

async function handler(ctx) {
    const section = ctx.req.param('section');

    let info;
    let sectionLink;

    switch (section) {
        case 'singapore':
            info = '新加坡';
            sectionLink = '/news/singapore';

            break;

        case 'world':
            info = '国际';
            sectionLink = '/news/world';

            break;

        case 'sea':
            info = '东南亚';
            sectionLink = '/news/sea';

            break;

        case 'sports':
            info = '体育';
            sectionLink = '/news/sports';

            break;

        case 'china':
        default:
            info = '中国';
            sectionLink = '/news/china';
    }

    const { resultList } = await parseList(sectionLink);

    return {
        title: `《联合早报》-${info}-新闻`,
        link: baseUrl + sectionLink,
        description: '新加坡、中国、亚洲和国际的即时、评论、商业、体育、生活、科技与多媒体新闻，尽在联合早报。',
        image: logo,
        item: resultList,
    };
}
