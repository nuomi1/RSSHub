import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const LOCALE_OPTIONS = [
    { value: 'zh_CN', label: 'Chinese' },
    { value: 'en_US', label: 'English' },
    { value: 'fr_FR', label: 'French' },
    { value: 'de_DE', label: 'German' },
    { value: 'ja_JP', label: 'Japanese' },
    { value: 'ko_KR', label: 'Korean' },
    { value: 'pt_BR', label: 'Portuguese' },
    { value: 'es_ES', label: 'Spanish' },
    { value: 'ru_RU', label: 'Russian' },
    { value: 'id_ID', label: 'Indonesian' },
    { value: 'tr_TR', label: 'Turkish' },
];
const LOCALE_OPTIONS_DEFAULT = 'zh_CN';

export const route: Route = {
    path: '/awsblogs/:locale?',
    categories: ['blog'],
    example: '/amazon/awsblogs',
    parameters: {
        locale: { description: 'Blog posts in a specified language, only the following options are supported. Default `zh_CN`', options: LOCALE_OPTIONS, default: LOCALE_OPTIONS_DEFAULT },
    },
    description: renderOptionsMarkdownTable({
        parameter: 'locale',
        description: '语言',
        options: LOCALE_OPTIONS,
    }),
    name: 'AWS Blogs',
    maintainers: ['HankChow'],
    handler,
};

async function handler(ctx) {
    const locale = ctx.req.param('locale') ?? LOCALE_OPTIONS_DEFAULT;

    const response = await got({
        url: `https://aws.amazon.com/api/dirs/items/search?item.directoryId=blog-posts&sort_by=item.additionalFields.createdDate&sort_order=desc&size=50&item.locale=${locale}`,
    });

    const items = response.data.items;

    return {
        title: 'AWS Blog',
        link: 'https://aws.amazon.com/blogs/',
        description: 'AWS Blog 更新',
        item:
            items &&
            items.map((item) => ({
                title: item.item.additionalFields.title,
                description: item.item.additionalFields.postExcerpt,
                pubDate: parseDate(item.item.dateCreated),
                link: item.item.additionalFields.link,
                author: item.item.additionalFields.contributors,
            })),
    };
}
