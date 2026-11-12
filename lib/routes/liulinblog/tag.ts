import type { Route } from '@/types';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';

import { handler } from './index';

const ID_OPTIONS = [
    { value: 'qukuailian', label: '区块链' },
    { value: 'xiaohongshu', label: '小红书' },
    { value: 'xiaoshuo', label: '小说项目' },
    { value: '微信公众号', label: '微信公众号' },
    { value: 'we-chat', label: '微信营销' },
    { value: '抖音', label: '抖音' },
    { value: '抖音直播', label: '抖音直播' },
    { value: 'pinduoduo', label: '拼多多' },
    { value: 'alipay', label: '支付宝' },
    { value: '教育', label: '教育' },
    { value: 'chrome 插件', label: 'chrome 插件' },
    { value: 'galgame', label: 'galgame 汉化游戏' },
    { value: 'honey-select', label: 'honeyselect 汉化游戏' },
    { value: 'psd-bishua', label: 'PSD 笔刷素材' },
    { value: 'ps-chajian', label: 'ps 插件' },
    { value: 'vip-shipin', label: 'vip 视频' },
    { value: 'computer', label: 'windows 实用技巧' },
    { value: 'download', label: '下载软件' },
    { value: 'siwa', label: '丝袜玉足' },
    { value: 'ziti', label: '免费字体下载' },
    { value: 'war-games', label: '二战游戏下载' },
    { value: '冒险解谜游戏', label: '冒险解谜游戏' },
    { value: '动作游戏下载', label: '动作游戏下载' },
    { value: 'android-game', label: '安卓游戏' },
    { value: 'game-celve', label: '策略游戏' },
    { value: 'pr 插件', label: 'Pr 插件' },
    { value: 'python', label: 'Python' },
    { value: 'seo', label: 'seo 优化' },
    { value: 'vlog', label: 'VLOG' },
    { value: 'wordpress', label: 'wordpress' },
    { value: 'word', label: 'word 技巧' },
];

export const route: Route = {
    path: '/tag/:id',
    categories: ['new-media'],
    example: '/liulinblog/tag/qukuailian',
    parameters: { id: { description: '标签 id，可在对应标签页 URL 中找到，见下表', options: ID_OPTIONS } },
    radar: [
        {
            source: ['liulinblog.com/tag/:id', 'liulinblog.com/'],
            target: '/tag/:id',
        },
    ],
    name: '标签',
    maintainers: ['nczitzk'],
    handler,
    description: renderOptionsMarkdownTable({
        parameter: 'id',
        description: '标签 id',
        options: ID_OPTIONS,
    }),
};
