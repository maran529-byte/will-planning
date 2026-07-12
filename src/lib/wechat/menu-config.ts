/**
 * 公众号自定义菜单配置
 * 单一来源 - 所有菜单变更改这里, 然后调 POST /api/wechat/admin/menu 推送到公众号
 * @see docs/公众号配置清单.md §3
 */

import type { MenuConfig } from './mp-api';

export const MP_MENU: MenuConfig = {
  button: [
    {
      name: '立即体验',
      sub_button: [
        {
          type: 'view',
          name: '起草文书',
          url: 'https://h5.aiwill-planner.cn/questionnaire',
        },
        {
          type: 'view',
          name: '6 类文书价格',
          url: 'https://h5.aiwill-planner.cn/pricing',
        },
        {
          type: 'view',
          name: '今日热点解读',
          url: 'https://h5.aiwill-planner.cn/knowledge',
        },
      ],
    },
    {
      name: '我的账户',
      sub_button: [
        {
          type: 'view',
          name: '账号绑定',
          url: 'https://h5.aiwill-planner.cn/wechat/bind?return=/orders',
        },
        {
          type: 'view',
          name: '电脑端登录',
          url: 'https://h5.aiwill-planner.cn/wechat/pc-confirm',
        },
        {
          type: 'view',
          name: '我的订单',
          url: 'https://h5.aiwill-planner.cn/orders',
        },
      ],
    },
    {
      name: '帮助中心',
      sub_button: [
        {
          type: 'view',
          name: '常见问题',
          url: 'https://h5.aiwill-planner.cn/faq',
        },
        {
          type: 'view',
          name: '联系客服',
          url: 'https://h5.aiwill-planner.cn/contact',
        },
        {
          type: 'click',
          name: '人工客服',
          key: 'V1001_HUMAN_SERVICE',
        },
      ],
    },
  ],
};
