import { load } from 'cheerio';
import type { Comment } from 'domhandler';
import { renderToString } from 'hono/jsx/dom/server';

import type { Route } from '@/types';
import got from '@/utils/got';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

const BOARD_OPTIONS = [
    { value: 'realtime', label: '热搜榜' },
    { value: 'novel', label: '小说榜' },
    { value: 'movie', label: '电影榜' },
    { value: 'teleplay', label: '电视剧榜' },
    { value: 'car', label: '汽车榜' },
    { value: 'game', label: '游戏榜' },
];
const BOARD_OPTIONS_DEFAULT = 'realtime';

const renderDescription = (item) =>
    renderToString(
        <>
            {item.img ? (
                <>
                    <img src={item.img} />
                    <br />
                </>
            ) : null}
            {item.show
                ? item.show.map((text) => (
                      <>
                          {text}
                          <br />
                      </>
                  ))
                : null}
            {item.desc}
        </>
    );

export const route: Route = {
    path: '/top/:board?',
    categories: ['other'],
    example: '/baidu/top',
    parameters: { board: { description: '榜单，默认为 `realtime`', options: BOARD_OPTIONS, default: BOARD_OPTIONS_DEFAULT } },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '热搜榜单',
    maintainers: ['xyqfer'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'board',
        description: '榜单',
        options: BOARD_OPTIONS,
    }),
};

async function handler(ctx) {
    const { board = BOARD_OPTIONS_DEFAULT } = ctx.req.param();
    const link = `https://top.baidu.com/board?tab=${board}`;
    const { data: response } = await got(link);

    const $ = load(response);

    const sDataMatch = $('#sanRoot')
        .contents()
        .toArray()
        .find((e): e is Comment => e.nodeType === 8)
        ?.data.match(/s-data:(.*)/);
    if (!sDataMatch) {
        throw new Error('Unable to find s-data in page');
    }
    const { data } = JSON.parse(sDataMatch[1]);

    const items = data.cards[0].content.map((item) => ({
        title: item.word,
        description: renderDescription(item),
        link: item.rawUrl,
    }));

    return {
        title: `${data.curBoardName} - 百度热搜`,
        description: $('meta[name="description"]').attr('content'),
        link,
        item: items,
    };
}
