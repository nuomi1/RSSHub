import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const TAG_OPTIONS = [
    { value: 'json', label: 'JSON' },
    { value: 'javascript', label: 'Javascript' },
    { value: 'java', label: 'Java' },
    { value: 'apache', label: 'Apache' },
    { value: 'aws', label: 'AWS' },
    { value: 'sql', label: 'SQL' },
    { value: 'react', label: 'React' },
    { value: 'golang', label: 'Golang' },
];

export const route: Route = {
    path: '/tag/:tag',
    categories: ['programming'],
    example: '/engineering/tag/javascript',
    parameters: { tag: { description: 'Browse programming languages, frameworks, and technologies', options: TAG_OPTIONS } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['engineering.fyi/tag/:tag'],
        },
    ],
    name: 'Tag',
    maintainers: ['suhang-only'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'tag',
        description: '说明',
        options: TAG_OPTIONS,
    }),
};

async function handler(ctx) {
    const tag = ctx.req.param('tag');
    const { data: response } = await got(`https://engineering.fyi/tag/${tag}`);
    const $ = load(response);
    const items = $('div.text-card-foreground')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const a = $item.find('a').eq(2);
            const description = $item.find('.leading-relaxed');
            const author = $item.find('.truncate').text();
            return {
                title: a.text(),
                link: a.attr('href'),
                description: description.text(),
                author: author || undefined,
                category: $item
                    .find('a[href^="/tag/"]')
                    .toArray()
                    .map((element) => $(element).text()),
            };
        });

    return {
        title: `engineering.fyi ${tag}`,
        link: `https://engineering.fyi/tag/${tag}`,
        item: items,
    };
}
