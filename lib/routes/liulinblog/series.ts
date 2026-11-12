import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: 'xunlei', label: '【免费速存】迅雷资源合集' },
    { value: 'zhibodaihuo', label: '直播带货教程' },
    { value: 'dianshangpeixun', label: '电商培训课程' },
    { value: 'pinduoduo', label: '拼多多运营培训' },
    { value: 'xiaohongshu', label: '小红书运营' },
    { value: 'douyinyunying', label: '抖音运营' },
    { value: 'xianyuyunying', label: '闲鱼运营' },
    { value: 'duanshipinyunying', label: '短视频运营' },
];

export const route: Route = {
    path: '/series/:id',
    categories: ['new-media'],
    example: '/liulinblog/series/xunlei',
    parameters: { id: { description: '专题 id，可在对应标签页 URL 中找到，见下表', options: ID_OPTIONS } },
    radar: [
        {
            source: ['liulinblog.com/series/:id', 'liulinblog.com/'],
            target: '/series/:id',
        },
    ],
    name: '专题',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '专题 id',
        options: ID_OPTIONS,
    }),
};
