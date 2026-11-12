import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { getCmsItems } from './utils';

const TYPES_OPTIONS = [
    { value: 'jwtz', label: '教务通知' },
    { value: 'jwdt', label: '教务动态' },
];
const TYPES_OPTIONS_DEFAULT = 'jwtz';

export const route: Route = {
    path: '/jwc/:types?',
    categories: ['university'],
    example: '/jsu/jwc/jwdt',
    parameters: { types: { description: '通知分类 默认为`jwtz`', options: TYPES_OPTIONS, default: TYPES_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '教务处',
    maintainers: ['wenjia03'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'types',
        description: '通知分类',
        options: TYPES_OPTIONS,
    }),
};

async function handler(ctx) {
    const { types = TYPES_OPTIONS_DEFAULT } = ctx.req.param();
    const sections = {
        jwtz: { category: '教务通知', url: 'https://jwc.jsu.edu.cn/tzgg/index.htm' },
        jwdt: { category: '教务动态', url: 'https://jwc.jsu.edu.cn/jwdt/index.htm' },
    };
    if (!Object.hasOwn(sections, types)) {
        throw new InvalidParameterError('Unsupported Jishou University academic affairs category. Use jwtz or jwdt.');
    }
    const section = sections[types];
    return {
        title: `吉首大学教务处 - ${section.category}`,
        link: section.url,
        description: `吉首大学教务处 - ${section.category}`,
        item: await getCmsItems(section.url, section.category),
    };
}
