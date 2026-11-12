import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const CHANNEL_OPTIONS = [
    { value: '', label: '网络营销' },
    { value: 'dianshang', label: '电商运营' },
    { value: 'internet', label: '互联网早报' },
    { value: 'seo', label: '站长圈' },
];

export const route: Route = {
    path: '/itnews/:channel',
    categories: ['new-media'],
    example: '/liulinblog/itnews/seo',
    parameters: { channel: { description: '频道，见下表', options: CHANNEL_OPTIONS } },
    name: '网络营销',
    maintainers: ['Fatpandac', 'nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'channel',
        description: '频道',
        options: CHANNEL_OPTIONS,
    }),
};

function handler(ctx) {
    const { channel } = ctx.req.param();
    return ctx.set('redirect', `/liulinblog/${channel}${new URL(ctx.req.url).search}`);
}
