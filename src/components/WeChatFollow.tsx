/**
 * 微信公众号关注入口
 *
 * 合规要求 (《互联网信息服务深度合成管理规定》《微信公众平台服务协议》):
 *  - 站点需提供官方联系方式
 *  - 公众号关注引导应明确、显著、不可诱导
 *  - 不得通过 AI 自动代用户完成关注操作
 *
 * 此组件为纯 UI 入口:
 *  - 显示公众号名称
 *  - 显示二维码占位 (用户扫码后跳转至微信 → 搜索 → 关注)
 *  - 提供搜索关键字
 *  - 注: 真实二维码图片放在 /public/wechat-mp-qr.png (本组件内 SVG 占位, 上线前替换)
 */
export default function WeChatFollow({
  variant = 'inline',
  mpName = '家有所爱',
  mpSearchKeyword = '家有所爱',
}: {
  variant?: 'inline' | 'card' | 'compact';
  mpName?: string;
  mpSearchKeyword?: string;
}) {
  if (variant === 'compact') {
    // 页眉/页脚的小条幅, 只一行文字
    return (
      <div className="flex items-center justify-center gap-2 text-sm">
        <span className="text-base">📱</span>
        <span className="text-slate-600">关注公众号</span>
        <span className="font-semibold text-slate-800">「{mpName}」</span>
        <span className="text-slate-400">·</span>
        <span className="text-slate-500">微信搜</span>
        <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs">
          {mpSearchKeyword}
        </code>
      </div>
    );
  }

  if (variant === 'card') {
    // 独立卡片式 (用于工具页 / FAQ 页中段)
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 my-8">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">
            {/* 公众号推广物料图片 */}
            <img
              src="/wechat-mp-qr.png"
              alt="扫码关注公众号「家有所爱」"
              className="w-28 h-28 object-contain rounded-lg"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <span>📱</span>
              <span>关注公众号「{mpName}」</span>
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-3">
              微信扫码关注公众号, 第一时间获取:
            </p>
            <ul className="text-slate-600 text-sm space-y-1 mb-3">
              <li>· 文书模板更新通知</li>
              <li>· 资产规划小贴士</li>
              <li>· 订单状态实时推送</li>
            </ul>
            <p className="text-xs text-slate-500">
              或微信搜 <code className="px-1.5 py-0.5 bg-white text-slate-700 rounded border border-slate-200">{mpSearchKeyword}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // inline: 嵌入到法律底栏
  return (
    <div className="flex items-center justify-center gap-3 text-slate-300 text-sm">
      <span className="text-lg">📱</span>
      <span>关注公众号</span>
      <span className="font-semibold text-white">「{mpName}」</span>
      <span className="text-slate-500">·</span>
      <span>微信搜</span>
      <code className="px-2 py-0.5 bg-slate-700 text-slate-200 rounded text-xs">
        {mpSearchKeyword}
      </code>
    </div>
  );
}
