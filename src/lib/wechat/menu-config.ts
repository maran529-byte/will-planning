/**
 * 公众号自定义菜单配置
 * 单一来源 - 所有菜单变更改这里, 然后调 POST /api/wechat/admin/menu 推送到公众号
 * 改版 v1.0 (2026-07-24): 3 大主菜单 + 9 个子菜单, 全部跳转 H5 + ?from=wechat-mp 追踪
 * @see docs/公众号配置清单.md §3
 * @see /Users/maran/Desktop/爱的延续网站-核心架构与自进化手册_v1.md §1.6.3
 */

import type { MenuConfig } from './mp-api';

export const MP_MENU: MenuConfig = {
  button: [
    {
      name: '生成文书',
      sub_button: [
        {
          type: 'view',
          name: '开始问卷',
          url: 'https://h5.aiwill-planner.cn/questionnaire?from=wechat-mp',
        },
        {
          type: 'view',
          name: '6 类文书',
          url: 'https://h5.aiwill-planner.cn/doc-type?from=wechat-mp',
        },
        {
          type: 'view',
          name: '价格说明',
          url: 'https://aiwill-planner.cn/pricing',
        },
      ],
    },
    {
      name: '我的订单',
      sub_button: [
        {
          type: 'view',
          name: '订单列表',
          url: 'https://h5.aiwill-planner.cn/orders?from=wechat-mp',
        },
        {
          type: 'view',
          name: '我的红包',
          url: 'https://h5.aiwill-planner.cn/wallet-policy?from=wechat-mp',
        },
        {
          type: 'view',
          name: '账号绑定',
          url: 'https://h5.aiwill-planner.cn/wechat/bind?return=/orders&from=wechat-mp',
        },
      ],
    },
    {
      name: '个人中心',
      sub_button: [
        {
          type: 'view',
          name: '个人资料',
          url: 'https://h5.aiwill-planner.cn/account?from=wechat-mp',
        },
        {
          type: 'view',
          name: '电脑端登录',
          url: 'https://h5.aiwill-planner.cn/wechat/pc-confirm?from=wechat-mp',
        },
        {
          type: 'view',
          name: '民法典指南',
          url: 'https://h5.aiwill-planner.cn/knowledge?from=wechat-mp',
        },
        {
          type: 'view',
          name: '定制留言',
          url: 'https://h5.aiwill-planner.cn/custom?from=wechat-mp',
        },
      ],
    },
  ],
};

export const MP_GREETING_TEXT = `欢迎关注「家有所爱」❤️

📚 6 类家庭文书 (婚前/婚内/离婚/抚养/赠与/传承), 统一 ¥19.9
🎁 自动红包 ¥2-10, 分享注册再得 ¥2
💰 代理博主提成 30%, 满 ¥50 可提现
📞 客服微信: 家有所爱
📧 联系邮箱: 330320991@qq.com
⏰ 服务时间: 9:00-21:00

点击下方菜单开始 →`;
