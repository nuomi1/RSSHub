import { load } from 'cheerio';
import type { Context } from 'hono';
import pMap from 'p-map';

import type { Data, DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import timezone from '@/utils/timezone';

const NAME_OPTIONS = [
    { value: 'all', label: '全部' },
    { value: 'xwdt', label: '新闻动态' },
    { value: 'gsgg', label: '公示公告' },
];
const NAME_OPTIONS_DEFAULT = 'all';

export const route: Route = {
    path: '/tw/:name?',
    categories: ['university'],
    example: '/lit/tw',
    parameters: { name: { description: '默认为 `all`', options: NAME_OPTIONS, default: NAME_OPTIONS_DEFAULT } },
    name: '团委',
    maintainers: ['vhxubo'],
    description: renderOptionsMarkdownTable({
        parameter: 'name',
        description: '名称',
        options: NAME_OPTIONS,
    }),
    handler,
};

const baseUrl = 'https://www.lit.edu.cn/tw/';
const nameProps = {
    xwdt: '新闻动态',
    gsgg: '公示公告',
};

async function handler(ctx: Context): Promise<Data> {
    const { name = NAME_OPTIONS_DEFAULT } = ctx.req.param();
    const urla = new URL(name === 'all' ? 'xb2024.htm' : `xb2024/syxw/${name}.htm`, baseUrl).href;
    const response = await ofetch(urla);
    const $ = load(response);

    const list: DataItem[] = $(name === 'all' ? '.newslayout li, .announlist1 li' : '.newslist li')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const a = $item.find('a');
            return {
                title: a.text(),
                link: new URL(a.attr('href')!, urla).href,
                pubDate: timezone(parseDate($item.find('i, span').text() || `${$item.find('.rq p').text()}-${$item.find('.rq h2').text()}`), 8),
            };
        });

    const items = await pMap(
        list,
        (item) =>
            item.link!.includes('xb2024info.jsp')
                ? item
                : cache.tryGet(item.link!, async () => {
                      const result = await ofetch(item.link!);
                      const $ = load(result);

                      $(
                          'img[src="/system/resource/images/fileTypeImages/icon_xls.gif"], img[src="/system/resource/images/fileTypeImages/icon_doc.gif"], img[src="/system/resource/images/fileTypeImages/icon_ppt.gif"], img[src="/system/resource/images/fileTypeImages/icon_pdf.gif"]'
                      ).remove();

                      item.title = $('.article-title').text() || item.title;
                      item.description = $('.v_news_content').html();

                      return item;
                  }),
        { concurrency: 3 }
    );

    return {
        title: name === 'all' ? '团委 - 洛阳理工学院' : `${nameProps[name]} - 洛理团委`,
        link: urla,
        description: '洛阳理工学院团委 RSS',
        item: items,
    };
}
