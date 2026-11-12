import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { logo, parseList } from './util';

const SECTION_OPTIONS = [
    { value: 'china', label: '中国' },
    { value: 'singapore', label: '新加坡' },
    { value: 'world', label: '国际' },
    { value: 'zfinance', label: '财经' },
];
const SECTION_OPTIONS_DEFAULT = 'china';

const baseUrl = 'https://www.zaobao.com';

export const route: Route = {
    path: '/realtime/:section?',
    categories: ['traditional-media'],
    example: '/zaobao/realtime/china',
    parameters: { section: { description: '分类，缺省为 china', options: SECTION_OPTIONS, default: SECTION_OPTIONS_DEFAULT } },
    name: '即时新闻',
    maintainers: ['shunf4'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'section',
        description: '分类',
        options: SECTION_OPTIONS,
    }),
};

async function handler(ctx) {
    const section = ctx.req.param('section') ?? SECTION_OPTIONS_DEFAULT;

    let name;
    let sectionLink;
    switch (section) {
        case 'singapore':
            name = '新加坡';
            sectionLink = '/realtime/singapore';

            break;

        case 'world':
            name = '国际';
            sectionLink = '/realtime/world';

            break;

        case 'zfinance':
            name = '财经';
            sectionLink = '/realtime/finance';

            break;

        case 'china':
        default:
            name = '中港台';
            sectionLink = '/realtime/china';
            break;
    }

    const { resultList } = await parseList(sectionLink);

    return {
        title: `《联合早报》-${name}-即时`,
        link: baseUrl + sectionLink,
        description: '新加坡、中国、亚洲和国际的即时、评论、商业、体育、生活、科技与多媒体新闻，尽在联合早报。',
        image: logo,
        item: resultList,
    };
}
