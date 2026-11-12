import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const PLATFORM_OPTIONS = [
    { value: 'desktop', label: 'Desktop' },
    { value: 'android', label: 'Android' },
    { value: 'beta', label: 'Beta' },
    { value: 'nightly', label: 'Nightly' },
    { value: 'ios', label: 'iOS' },
];
const PLATFORM_OPTIONS_DEFAULT = 'desktop';

const platformSlugs = {
    desktop: 'releasenotes',
    beta: 'beta/notes',
    nightly: 'nightly/notes',
    android: 'android/releasenotes',
    ios: 'ios/notes',
};

export const route: Route = {
    path: '/release/:platform?',
    categories: ['program-update'],
    example: '/firefox/release/desktop',
    parameters: { platform: { description: 'the platform', options: PLATFORM_OPTIONS, default: PLATFORM_OPTIONS_DEFAULT } },
    description: renderOptionsMarkdownTable({
        parameter: 'platform',
        description: 'the platform',
        options: PLATFORM_OPTIONS,
    }),
    name: 'New Release',
    maintainers: ['fengkx'],
    handler,
};

async function handler(ctx) {
    const { platform = PLATFORM_OPTIONS_DEFAULT } = ctx.req.param();
    const devicePlatform = platform.replace('-', '/');

    const link = ['https://www.mozilla.org/en-US/firefox', Object.hasOwn(platformSlugs, devicePlatform) ? platformSlugs[devicePlatform] : devicePlatform].filter(Boolean).join('/');
    const response = await got.get(link);
    const $ = load(response.data);
    const version = $('.c-release-version').text();
    const itemLink = $('link[rel="canonical"]').attr('href') || link;
    const date = $('.c-release-date').text().trim();
    const pubDate = date ? parseDate(`${date} UTC`) : undefined;

    return {
        title: `Firefox ${platform} release notes`,
        link,
        item: [
            {
                title: `Firefox ${platform} ${version} release notes`,
                link: itemLink,
                description: $('.c-release-notes').html(),
                guid: `${platform} ${version}`,
                pubDate,
            },
        ],
    };
}
