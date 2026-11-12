import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { track } from './track';

const LOCALE_OPTIONS = [
    { value: 'ja', label: 'Japanese' },
    { value: 'en', label: 'English' },
];

export const route: Route = {
    name: 'Track & Trace Service',
    path: '/track/:reqCode/:locale?',
    example: '/japanpost/track/EJ123456789JP/en',
    url: 'trackings.post.japanpost.jp/services/srv/search/',
    handler: track,
    categories: ['other'],
    maintainers: ['tuzi3040'],
    parameters: {
        reqCode: 'Package Number',
        locale: { description: 'Language, default to japanese `ja`', options: LOCALE_OPTIONS },
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: false, // unsupported due to deprecation of `target` as a function in RSSHub-Radar 2.0.19
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    description: renderOptionsMarkdownTable({
        parameter: 'locale',
        description: 'Language',
        options: LOCALE_OPTIONS,
    }),
    zh: {
        name: '邮件追踪查询',
    },
    ja: {
        name: '郵便追跡サービス',
    },
};
