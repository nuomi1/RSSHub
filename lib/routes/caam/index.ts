import { load } from 'cheerio';

import type { DataItem, Language, Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import { renderOptionsMarkdownTable } from '@/utils/render-markdown-table';
import { getRouteLimit } from '@/utils/route-limit';

const CATEGORY_OPTIONS = [
    { value: '1', label: '[首页](http://www.caam.org.cn/chn/1/cate_1/list_1.html)' },
    { value: '2', label: '[行业要闻](http://www.caam.org.cn/chn/1/cate_2/list_1.html)' },
    { value: '3', label: '[协会活动](http://www.caam.org.cn/chn/1/cate_3/list_1.html)' },
    { value: '4', label: '[会员专区](http://www.caam.org.cn/chn/1/cate_4/list_1.html)' },
    { value: '5', label: '[协会概况](http://www.caam.org.cn/chn/1/cate_5/list_1.html)' },
    { value: '6', label: '[协会概况 - 会员单位](http://www.caam.org.cn/chn/1/cate_6/list_1.html)' },
    { value: '7', label: '[协会概况 - 协会简介](http://www.caam.org.cn/chn/1/cate_7/list_1.html)' },
    { value: '8', label: '[协会概况 - 协会章程](http://www.caam.org.cn/chn/1/cate_8/list_1.html)' },
    { value: '9', label: '[协会概况 - 组织机构](http://www.caam.org.cn/chn/1/cate_9/list_1.html)' },
    { value: '10', label: '[协会概况 - 主要职责](http://www.caam.org.cn/chn/1/cate_10/list_1.html)' },
    { value: '11', label: '[协会概况 - 协会荣誉](http://www.caam.org.cn/chn/1/cate_11/list_1.html)' },
    { value: '12', label: '[协会概况 - 分支机构](http://www.caam.org.cn/chn/1/cate_12/list_1.html)' },
    { value: '13', label: '[协会概况 - 分支机构 - 机构介绍](http://www.caam.org.cn/chn/1/cate_13/list_1.html)' },
    { value: '14', label: '[协会概况 - 分支机构 - 管理办法](http://www.caam.org.cn/chn/1/cate_14/list_1.html)' },
    { value: '15', label: '[协会概况 - 分支机构 - 业务范围](http://www.caam.org.cn/chn/1/cate_15/list_1.html)' },
    { value: '16', label: '[协会工作](http://www.caam.org.cn/chn/1/cate_16/list_1.html)' },
    { value: '17', label: '[协会工作 - 协会动态](http://www.caam.org.cn/chn/1/cate_17/list_1.html)' },
    { value: '18', label: '[协会工作 - 分支机构动态](http://www.caam.org.cn/chn/1/cate_18/list_1.html)' },
    { value: '19', label: '[协会工作 - 重点工作](http://www.caam.org.cn/chn/1/cate_19/list_1.html)' },
    { value: '20', label: '[协会工作 - 法规标准](http://www.caam.org.cn/chn/1/cate_20/list_1.html)' },
    { value: '21', label: '[协会工作 - 信用服务](http://www.caam.org.cn/chn/1/cate_21/list_1.html)' },
    { value: '22', label: '[协会工作 - 会员服务](http://www.caam.org.cn/chn/1/cate_22/list_1.html)' },
    { value: '23', label: '[协会工作 - 政策研究](http://www.caam.org.cn/chn/1/cate_23/list_1.html)' },
    { value: '24', label: '[协会工作 - 协调合作](http://www.caam.org.cn/chn/1/cate_24/list_1.html)' },
    { value: '25', label: '[协会工作 - 展会信息](http://www.caam.org.cn/chn/1/cate_25/list_1.html)' },
    { value: '26', label: '[协会工作 - 国际合作](http://www.caam.org.cn/chn/1/cate_26/list_1.html)' },
    { value: '27', label: '[协会工作 - 会员动态](http://www.caam.org.cn/chn/1/cate_27/list_1.html)' },
    { value: '28', label: '[协会工作 - 行业培训](http://www.caam.org.cn/chn/1/cate_28/list_1.html)' },
    { value: '29', label: '[统计数据](http://www.caam.org.cn/chn/1/cate_29/list_1.html)' },
    { value: '30', label: '[统计数据 - 产销](http://www.caam.org.cn/chn/1/cate_30/list_1.html)' },
    { value: '31', label: '[统计数据 - 产销 - 汽车](http://www.caam.org.cn/chn/1/cate_31/list_1.html)' },
    { value: '32', label: '[统计数据 - 产销 - 摩托车](http://www.caam.org.cn/chn/1/cate_32/list_1.html)' },
    { value: '33', label: '[统计数据 - 产销 - 零部件](http://www.caam.org.cn/chn/1/cate_33/list_1.html)' },
    { value: '34', label: '[统计数据 - 进出口](http://www.caam.org.cn/chn/1/cate_34/list_1.html)' },
    { value: '35', label: '[统计数据 - 进出口 - 汽车](http://www.caam.org.cn/chn/1/cate_35/list_1.html)' },
    { value: '36', label: '[统计数据 - 进出口 - 摩托车](http://www.caam.org.cn/chn/1/cate_36/list_1.html)' },
    { value: '37', label: '[统计数据 - 进出口 - 零部件](http://www.caam.org.cn/chn/1/cate_37/list_1.html)' },
    { value: '38', label: '[统计数据 - 数据分析](http://www.caam.org.cn/chn/1/cate_38/list_1.html)' },
    { value: '39', label: '[统计数据 - 数据分析 - 国内数据](http://www.caam.org.cn/chn/1/cate_39/list_1.html)' },
    { value: '40', label: '[统计数据 - 数据分析 - 国外数据](http://www.caam.org.cn/chn/1/cate_40/list_1.html)' },
    { value: '41', label: '[统计数据 - 亚洲](http://www.caam.org.cn/chn/1/cate_41/list_1.html)' },
    { value: '42', label: '[统计数据 - 亚洲 - 日本](http://www.caam.org.cn/chn/1/cate_42/list_1.html)' },
    { value: '43', label: '[统计数据 - 亚洲 - 泰国](http://www.caam.org.cn/chn/1/cate_43/list_1.html)' },
    { value: '44', label: '[统计数据 - 亚洲 - 印度](http://www.caam.org.cn/chn/1/cate_44/list_1.html)' },
    { value: '45', label: '[统计数据 - 亚洲 - 印尼](http://www.caam.org.cn/chn/1/cate_45/list_1.html)' },
    { value: '46', label: '[统计数据 - 亚洲 - 韩国](http://www.caam.org.cn/chn/1/cate_46/list_1.html)' },
    { value: '47', label: '[统计数据 - 亚洲 - 巴基斯坦](http://www.caam.org.cn/chn/1/cate_47/list_1.html)' },
    { value: '48', label: '[统计数据 - 亚洲 - 其他](http://www.caam.org.cn/chn/1/cate_48/list_1.html)' },
    { value: '49', label: '[统计数据 - 欧洲](http://www.caam.org.cn/chn/1/cate_49/list_1.html)' },
    { value: '50', label: '[统计数据 - 欧洲 - 总汇](http://www.caam.org.cn/chn/1/cate_50/list_1.html)' },
    { value: '51', label: '[统计数据 - 欧洲 - 德国](http://www.caam.org.cn/chn/1/cate_51/list_1.html)' },
    { value: '52', label: '[统计数据 - 欧洲 - 英国](http://www.caam.org.cn/chn/1/cate_52/list_1.html)' },
    { value: '53', label: '[统计数据 - 欧洲 - 法国](http://www.caam.org.cn/chn/1/cate_53/list_1.html)' },
    { value: '54', label: '[统计数据 - 欧洲 - 意大利](http://www.caam.org.cn/chn/1/cate_54/list_1.html)' },
    { value: '55', label: '[统计数据 - 欧洲 - 西班牙](http://www.caam.org.cn/chn/1/cate_55/list_1.html)' },
    { value: '56', label: '[统计数据 - 大洋洲](http://www.caam.org.cn/chn/1/cate_56/list_1.html)' },
    { value: '57', label: '[统计数据 - 大洋洲 - 澳大利亚](http://www.caam.org.cn/chn/1/cate_57/list_1.html)' },
    { value: '58', label: '[统计数据 - 大洋洲 - 新西兰](http://www.caam.org.cn/chn/1/cate_58/list_1.html)' },
    { value: '59', label: '[统计数据 - 北美洲](http://www.caam.org.cn/chn/1/cate_59/list_1.html)' },
    { value: '60', label: '[统计数据 - 北美洲 - 总汇](http://www.caam.org.cn/chn/1/cate_60/list_1.html)' },
    { value: '61', label: '[统计数据 - 北美洲 - 美国](http://www.caam.org.cn/chn/1/cate_61/list_1.html)' },
    { value: '62', label: '[统计数据 - 南美洲](http://www.caam.org.cn/chn/1/cate_62/list_1.html)' },
    { value: '63', label: '[统计数据 - 南美洲 - 阿根廷](http://www.caam.org.cn/chn/1/cate_63/list_1.html)' },
    { value: '64', label: '[统计数据 - 南美洲 - 巴西](http://www.caam.org.cn/chn/1/cate_64/list_1.html)' },
    { value: '65', label: '[统计数据 - 南美洲 - 其他](http://www.caam.org.cn/chn/1/cate_65/list_1.html)' },
    { value: '66', label: '[统计数据 - 非洲](http://www.caam.org.cn/chn/1/cate_66/list_1.html)' },
    { value: '67', label: '[文件公告](http://www.caam.org.cn/chn/1/cate_67/list_1.html)' },
    { value: '68', label: '[文件公告 - 协会文件](http://www.caam.org.cn/chn/1/cate_68/list_1.html)' },
    { value: '69', label: '[文件公告 - 公示公告](http://www.caam.org.cn/chn/1/cate_69/list_1.html)' },
    { value: '70', label: '[文件公告 - 会议通知](http://www.caam.org.cn/chn/1/cate_70/list_1.html)' },
    { value: '71', label: '[文件公告 - 分支机构文件](http://www.caam.org.cn/chn/1/cate_71/list_1.html)' },
    { value: '72', label: '[专题子站](http://www.caam.org.cn/chn/1/cate_72/list_1.html)' },
    { value: '73', label: '[专题子站 - 网站专题](http://www.caam.org.cn/chn/1/cate_73/list_1.html)' },
    { value: '74', label: '[专题子站 - 分支机构网站](http://www.caam.org.cn/chn/1/cate_74/list_1.html)' },
    { value: '75', label: '[专题子站 - 子网站](http://www.caam.org.cn/chn/1/cate_75/list_1.html)' },
    { value: '76', label: '[信息资料](http://www.caam.org.cn/chn/1/cate_76/list_1.html)' },
    { value: '77', label: '[信息资料 - 信息资料](http://www.caam.org.cn/chn/1/cate_77/list_1.html)' },
    { value: '78', label: '[信息资料 - 当前最热](http://www.caam.org.cn/chn/1/cate_78/list_1.html)' },
    { value: '79', label: '[行业动态](http://www.caam.org.cn/chn/1/cate_79/list_1.html)' },
    { value: '80', label: '[行业动态 - 政府资讯](http://www.caam.org.cn/chn/1/cate_80/list_1.html)' },
    { value: '81', label: '[行业动态 - 企业新闻](http://www.caam.org.cn/chn/1/cate_81/list_1.html)' },
    { value: '82', label: '[行业动态 - 行业动态](http://www.caam.org.cn/chn/1/cate_82/list_1.html)' },
    { value: '83', label: '[行业动态 - 车市动态](http://www.caam.org.cn/chn/1/cate_83/list_1.html)' },
    { value: '84', label: '[行业动态 - 国内召回](http://www.caam.org.cn/chn/1/cate_84/list_1.html)' },
    { value: '85', label: '[行业动态 - 国外召回](http://www.caam.org.cn/chn/1/cate_85/list_1.html)' },
    { value: '86', label: '[行业动态 - 汽车新技术](http://www.caam.org.cn/chn/1/cate_86/list_1.html)' },
    { value: '87', label: '[行业动态 - 市场环境](http://www.caam.org.cn/chn/1/cate_87/list_1.html)' },
    { value: '88', label: '[行业动态 - 国际动态](http://www.caam.org.cn/chn/1/cate_88/list_1.html)' },
    { value: '89', label: '[行业动态 - 国际动态 - 新闻](http://www.caam.org.cn/chn/1/cate_89/list_1.html)' },
    { value: '90', label: '[行业动态 - 国际动态 - 企业](http://www.caam.org.cn/chn/1/cate_90/list_1.html)' },
    { value: '91', label: '[行业动态 - 产品资讯](http://www.caam.org.cn/chn/1/cate_91/list_1.html)' },
    { value: '92', label: '[行业动态 - 相关行业](http://www.caam.org.cn/chn/1/cate_92/list_1.html)' },
    { value: '93', label: '[行业政策](http://www.caam.org.cn/chn/1/cate_93/list_1.html)' },
    { value: '95', label: '[行业政策 - 最新政策](http://www.caam.org.cn/chn/1/cate_95/list_1.html)' },
    { value: '96', label: '[行业政策 - 政策解读](http://www.caam.org.cn/chn/1/cate_96/list_1.html)' },
    { value: '97', label: '[行业政策 - 国家政策](http://www.caam.org.cn/chn/1/cate_97/list_1.html)' },
    { value: '98', label: '[行业政策 - 国家政策 - 产业政策](http://www.caam.org.cn/chn/1/cate_98/list_1.html)' },
    { value: '99', label: '[行业政策 - 国家政策 - 新能源汽车](http://www.caam.org.cn/chn/1/cate_99/list_1.html)' },
    { value: '100', label: '[行业政策 - 国家政策 - 节能环保](http://www.caam.org.cn/chn/1/cate_100/list_1.html)' },
    { value: '101', label: '[行业政策 - 国家政策 - 税收](http://www.caam.org.cn/chn/1/cate_101/list_1.html)' },
    { value: '102', label: '[行业政策 - 国家政策 - 进出口](http://www.caam.org.cn/chn/1/cate_102/list_1.html)' },
    { value: '103', label: '[行业政策 - 国家政策 - 其他](http://www.caam.org.cn/chn/1/cate_103/list_1.html)' },
    { value: '104', label: '[行业政策 - 地方政策](http://www.caam.org.cn/chn/1/cate_104/list_1.html)' },
    { value: '105', label: '[行业政策 - 相关政策](http://www.caam.org.cn/chn/1/cate_105/list_1.html)' },
    { value: '106', label: '[行业政策 - 国外政策](http://www.caam.org.cn/chn/1/cate_106/list_1.html)' },
    { value: '107', label: '[行业政策 - 政策报道](http://www.caam.org.cn/chn/1/cate_107/list_1.html)' },
    { value: '108', label: '[标准法规](http://www.caam.org.cn/chn/1/cate_108/list_1.html)' },
    { value: '109', label: '[标准法规 - 标准政策](http://www.caam.org.cn/chn/1/cate_109/list_1.html)' },
    { value: '110', label: '[标准法规 - 国家标准](http://www.caam.org.cn/chn/1/cate_110/list_1.html)' },
    { value: '111', label: '[标准法规 - 行业标准](http://www.caam.org.cn/chn/1/cate_111/list_1.html)' },
    { value: '112', label: '[标准法规 - 标准动态](http://www.caam.org.cn/chn/1/cate_112/list_1.html)' },
    { value: '113', label: '[标准法规 - 国际标准](http://www.caam.org.cn/chn/1/cate_113/list_1.html)' },
    { value: '114', label: '[标准法规 - 标准资料](http://www.caam.org.cn/chn/1/cate_114/list_1.html)' },
    { value: '115', label: '[基础资料](http://www.caam.org.cn/chn/1/cate_115/list_1.html)' },
    { value: '116', label: '[信息资料 - 公众资料](http://www.caam.org.cn/chn/1/cate_116/list_1.html)' },
    { value: '117', label: '[信息资料 - 成品油](http://www.caam.org.cn/chn/1/cate_117/list_1.html)' },
    { value: '118', label: '[信息资料 - 成品油 - 国内市场](http://www.caam.org.cn/chn/1/cate_118/list_1.html)' },
    { value: '119', label: '[信息资料 - 成品油 - 国际市场](http://www.caam.org.cn/chn/1/cate_119/list_1.html)' },
    { value: '120', label: '[信息资料 - 保有量](http://www.caam.org.cn/chn/1/cate_120/list_1.html)' },
    { value: '121', label: '[信息资料 - 公路交通](http://www.caam.org.cn/chn/1/cate_121/list_1.html)' },
    { value: '122', label: '[信息资料 - 公路交通 - 公路客运量](http://www.caam.org.cn/chn/1/cate_122/list_1.html)' },
    { value: '123', label: '[信息资料 - 公路交通 - 旅客周转量](http://www.caam.org.cn/chn/1/cate_123/list_1.html)' },
    { value: '124', label: '[信息资料 - 公路交通 - 公路货运量](http://www.caam.org.cn/chn/1/cate_124/list_1.html)' },
    { value: '125', label: '[信息资料 - 经济环境](http://www.caam.org.cn/chn/1/cate_125/list_1.html)' },
    { value: '126', label: '[公告查询](http://www.caam.org.cn/chn/1/cate_126/list_1.html)' },
    { value: '127', label: '[公告查询 - 公告批文](http://www.caam.org.cn/chn/1/cate_127/list_1.html)' },
    { value: '128', label: '[公告查询 - 公示公告](http://www.caam.org.cn/chn/1/cate_128/list_1.html)' },
    { value: '129', label: '[公告查询 - 节能与新能源](http://www.caam.org.cn/chn/1/cate_129/list_1.html)' },
    { value: '130', label: '[公告查询 - 公告动态](http://www.caam.org.cn/chn/1/cate_130/list_1.html)' },
    { value: '131', label: '[人物访谈](http://www.caam.org.cn/chn/1/cate_131/list_1.html)' },
    { value: '132', label: '[人物访谈 - 访谈列表](http://www.caam.org.cn/chn/1/cate_132/list_1.html)' },
    { value: '133', label: '[视频新闻](http://www.caam.org.cn/chn/1/cate_133/list_1.html)' },
    { value: '134', label: '[视频新闻 - 热门视频](http://www.caam.org.cn/chn/1/cate_134/list_1.html)' },
    { value: '135', label: '[视频新闻 - 推荐视频](http://www.caam.org.cn/chn/1/cate_135/list_1.html)' },
    { value: '136', label: '[视频新闻 - 视频列表](http://www.caam.org.cn/chn/1/cate_136/list_1.html)' },
    { value: '137', label: '[统计数据 - 欧洲 - 俄罗斯](http://www.caam.org.cn/chn/1/cate_137/list_1.html)' },
    { value: '138', label: '[统计数据 - 欧洲 - 爱尔兰](http://www.caam.org.cn/chn/1/cate_138/list_1.html)' },
    { value: '139', label: '[统计数据 - 欧洲 - 丹麦](http://www.caam.org.cn/chn/1/cate_139/list_1.html)' },
    { value: '140', label: '[统计数据 - 欧洲 - 其他](http://www.caam.org.cn/chn/1/cate_140/list_1.html)' },
    { value: '141', label: '[统计数据 - 大洋洲 - 其他](http://www.caam.org.cn/chn/1/cate_141/list_1.html)' },
    { value: '142', label: '[统计数据 - 北美洲 - 加拿大](http://www.caam.org.cn/chn/1/cate_142/list_1.html)' },
    { value: '144', label: '[统计数据 - 北美洲 - 其他](http://www.caam.org.cn/chn/1/cate_144/list_1.html)' },
    { value: '143', label: '[统计数据 - 北美洲 - 墨西哥](http://www.caam.org.cn/chn/1/cate_143/list_1.html)' },
    { value: '145', label: '[统计数据 - 非洲 - 南非](http://www.caam.org.cn/chn/1/cate_145/list_1.html)' },
    { value: '146', label: '[统计数据 - 非洲 - 其他](http://www.caam.org.cn/chn/1/cate_146/list_1.html)' },
    { value: '147', label: '[协会概况 - 分支机构 - 机构名单](http://www.caam.org.cn/chn/1/cate_147/list_1.html)' },
    { value: '148', label: '[首页 - 轮播](http://www.caam.org.cn/chn/1/cate_148/list_1.html)' },
    { value: '149', label: '[标准法规 - 标准政策 - 轮播](http://www.caam.org.cn/chn/1/cate_149/list_1.html)' },
    { value: '150', label: '[信息资料 - 信息资料 - 轮播](http://www.caam.org.cn/chn/1/cate_150/list_1.html)' },
    { value: '151', label: '[行业动态 - 行业资讯 - 轮播](http://www.caam.org.cn/chn/1/cate_151/list_1.html)' },
    { value: '152', label: '[行业政策 - 行业政策 - 轮播](http://www.caam.org.cn/chn/1/cate_152/list_1.html)' },
    { value: '153', label: '[协会工作 - 协会工作 - 轮播图](http://www.caam.org.cn/chn/1/cate_153/list_1.html)' },
    { value: '154', label: '[统计数据 - 数据统计 - 轮播图](http://www.caam.org.cn/chn/1/cate_154/list_1.html)' },
    { value: '155', label: '[Home](http://www.caam.org.cn/chn/1/cate_155/list_1.html)' },
    { value: '156', label: '[Home - Focus News](http://www.caam.org.cn/chn/1/cate_156/list_1.html)' },
    { value: '157', label: '[Home - Overview](http://www.caam.org.cn/chn/1/cate_157/list_1.html)' },
    { value: '158', label: '[Home - News](http://www.caam.org.cn/chn/1/cate_158/list_1.html)' },
    { value: '161', label: '[Home - Member sign](http://www.caam.org.cn/chn/1/cate_161/list_1.html)' },
    { value: '162', label: '[车桥分会](http://www.caam.org.cn/chn/1/cate_162/list_1.html)' },
    { value: '183', label: '[上市公司委员会](http://www.caam.org.cn/chn/1/cate_183/list_1.html)' },
    { value: '184', label: '[上市公司委员会 - 单位动态](http://www.caam.org.cn/chn/1/cate_184/list_1.html)' },
    { value: '185', label: '[上市公司委员会 - 临时公告](http://www.caam.org.cn/chn/1/cate_185/list_1.html)' },
];
const CATEGORY_OPTIONS_DEFAULT = '1';

export const route: Route = {
    path: '/:category?',
    categories: ['other'],
    example: '/caam/1',
    parameters: { category: { description: '分类，见下表，默认为首页', options: CATEGORY_OPTIONS, default: CATEGORY_OPTIONS_DEFAULT } },
    description: renderOptionsMarkdownTable({
        parameter: 'category',
        description: '分类',
        options: CATEGORY_OPTIONS,
    }),
    name: '分类',
    maintainers: ['nczitzk'],
    handler,
};

async function handler(ctx) {
    const { category = CATEGORY_OPTIONS_DEFAULT } = ctx.req.param();
    const limit = getRouteLimit(ctx, 30);

    const rootUrl = 'http://www.caam.org.cn';
    const currentUrl = new URL(`chn/1/cate_${category}/list_1.html`, rootUrl).href;

    const { data: response } = await got(currentUrl);

    const $ = load(response);

    let items = $('span.cont')
        .slice(0, limit)
        .toArray()
        .map((item): DataItem => {
            const $item = $(item);

            const a = $item.parent();

            return {
                title: $item.text(),
                link: new URL(a.prop('href')!, currentUrl).href,
                pubDate: parseDate(a.find('span.time').text(), '[YYYY.MM.DD]'),
            };
        });

    items = await Promise.all(
        items.map((item) =>
            cache.tryGet(item.link!, async () => {
                const { data: detailResponse } = await got(item.link);

                const content = load(detailResponse);

                const infoEls = content('div.fourTop em');

                item.title = content('div.fourTop h2').text();
                item.description = content('div.fourBox').html();
                item.author = infoEls.length <= 1 ? undefined : content('div.fourTop em').last().text();
                item.pubDate = parseDate(infoEls.first().text());

                return item;
            })
        )
    );

    const author = $('div.footer a').first().text();
    const subtitle = $('div.topMeuns ul li a').last().text();
    const image = new URL('images/header-back-7.png', rootUrl).href;

    return {
        item: items,
        title: `${author} - ${subtitle}`,
        link: currentUrl,
        description: $('meta[property="og:description"]').prop('content'),
        language: $('html').prop('lang') as Language,
        image,
        subtitle,
        author,
    };
}
