import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const OS_OPTIONS = [
    { value: 'mac', label: 'Mac OS' },
    { value: 'windows', label: 'Windows' },
];
const OS_OPTIONS_DEFAULT = 'mac';

export const route: Route = {
    path: '/release-notes/:os?',
    categories: ['program-update'],
    example: '/rescuetime/release-notes',
    parameters: { os: { description: 'OS id, see below', options: OS_OPTIONS, default: OS_OPTIONS_DEFAULT } },
    name: 'Release Notes',
    maintainers: ['nczitzk'],
    description: renderOptionsMarkdownTable({
        parameter: 'os',
        description: 'OS id',
        options: OS_OPTIONS,
    }),
    handler,
};

async function handler(ctx: Context) {
    const { os = OS_OPTIONS_DEFAULT } = ctx.req.param();

    const rootUrl = 'https://www.rescuetime.com/release-notes';
    const currentUrl = `${rootUrl}/${os}`;
    const response = await ofetch(currentUrl);

    const $ = load(response.replaceAll('<h3 align="left">', '</content><content><h3 align="left">'));

    const items = $('.release')
        .toArray()
        .map((item) => {
            const $item = $(item);

            const title = $item.find('h2').text();
            $item.find('h2').remove();
            const date = title.match(/(\d{4}(?:\/\d{2}){2})/)?.[1];

            return {
                title,
                link: `${currentUrl}#${encodeURIComponent(title)}`,
                description: $item.html(),
                pubDate: date ? parseDate(`${date} +0000`, 'YYYY/MM/DD ZZ') : undefined,
            };
        });

    return {
        title: $('h1').text(),
        link: currentUrl,
        item: items,
    };
}
