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
          name: '起草遗嘱',
          url: 'https://h5.aiwill-planner.cn/questionnaire',
        },
        {
          type: 'view',
          name: '我的订单',
          url: 'https://h5.aiwill-planner.cn/orders',
        },
        {
          type: 'view',
          name: '联系律师',
          url: 'https://h5.aiwill-planner.cn/?action=lawyer',
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
          name: '我的订单',
          url: 'https://h5.aiwill-planner.cn/orders',
        },
        {
          type: 'view',
          name: '联系律师',
          url: 'https://h5.aiwill-planner.cn/?action=lawyer',
        },
      ],
    },
    {
      name: '帮助中心',
      sub_button: [
        {
          type: 'view',
          name: '使用帮助',
          url: 'https://aiwill-planner.cn/faq',
        },
        {
          type: 'click',
          name: '人工客服',
          key: 'V1001_HUMAN_SERVICE',
        },
        {
          type: 'click',
          name: '备案查询',
          key: 'V1001_BEIAN',
        },
      ],
    },
  ],
};
