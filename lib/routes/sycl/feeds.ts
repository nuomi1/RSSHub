import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const FEED_OPTIONS = [
    { value: 'events', label: 'Events' },
    { value: 'news', label: 'News' },
    { value: 'research_papers', label: 'Research Paper' },
    { value: 'videos', label: 'Videos' },
];
const FEED_OPTIONS_DEFAULT = 'news';

export const route: Route = {
    path: '/:feed?',
    categories: ['programming'],
    example: '/sycl/news',
    parameters: { feed: { description: 'Feed source, defaults to news, references https://feeds.sycl.tech/', options: FEED_OPTIONS, default: FEED_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'Feeds',
    maintainers: ['mocusez'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'feed',
        description: 'Feed source',
        options: FEED_OPTIONS,
    }),
};

async function handler(ctx) {
    const feeds: string[] = ['news', 'events', 'research_papers', 'videos'];
    let { feed = FEED_OPTIONS_DEFAULT } = ctx.req.param();
    if (!feeds.includes(feed)) {
        feed = 'news';
    }
    const data = await ofetch(`https://feeds.sycl.tech/${feed}/feed.json`);

    const items = data.items.map((item) => ({
        title: item.title,
        link: item.external_url,
        description: item.content_html || item.summary,
        pubDate: item.date_published?.trim() ? parseDate(item.date_published) : undefined,
        author: item.author?.name,
        category: item.tags,
        image: item.image,
    }));

    return {
        title: `SYCL.tech ${feed}`,
        link: 'https://feeds.sycl.tech/',
        item: items,
    };
}
