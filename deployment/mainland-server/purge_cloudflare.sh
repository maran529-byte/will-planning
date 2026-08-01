#!/bin/bash
# ============================================================
# AI Will Planner — Cloudflare CDN 缓存清理脚本
# 用途 ：h5.aiwill-planner.cn 的 _next/static/chunks/ 旧 chunk
#        经常被 Cloudflare 缓存 (max-age=2592000), 即使 Vercel
#        已重新部署, 浏览器仍拉到旧 JS, 导致用户看到旧 UI
#        (例如老的手机号登录 tab).
#
# 用法 ：
#   1) 从 Cloudflare Dashboard → My Profile → API Tokens
#      创建 Edit Cloudflare Pages / Zone Cache Purge token
#   2) 在 ~/.zshrc 或 ~/.bash_profile 加入:
#         export CF_API_TOKEN="你的token"
#         export CF_ZONE_ID="你的zone id"   # aiwill-planner.cn
#   3) bash purge_cloudflare.sh
#
# 也可单独 purge 一组 URL:
#   PURGE_URLS="https://h5.aiwill-planner.cn/login" bash purge_cloudflare.sh
# ============================================================

set -e

CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_ZONE_NAME="${CF_ZONE_NAME:-aiwill-planner.cn}"

if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ]; then
    echo "❌ 缺少环境变量 CF_API_TOKEN 或 CF_ZONE_ID"
    echo "   请先在 ~/.zshrc 加上:"
    echo "     export CF_API_TOKEN=\"你的token\""
    echo "     export CF_ZONE_ID=\"你的zone id\""
    echo "   然后 source ~/.zshrc 再执行此脚本"
    exit 1
fi

# 1) 默认 purge 整站 + _next/static/* 路径
PURGE_URLS="${PURGE_URLS:-https://${CF_ZONE_NAME}/ https://h5.${CF_ZONE_NAME}/ https://h5.${CF_ZONE_NAME}/login https://h5.${CF_ZONE_NAME}/register https://h5.${CF_ZONE_NAME}/account}"

echo "==== Cloudflare Purge ===="
echo "Zone : ${CF_ZONE_NAME} (${CF_ZONE_ID})"
echo "URLs :"
for u in $PURGE_URLS; do
    echo "  - $u"
done
echo ""

# 2) 调用 Cloudflare API: purge_cache endpoint
RESP=$(curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "$(python3 -c "
import json, os, sys
urls = '''${PURGE_URLS}'''.split()
print(json.dumps({'files': urls}))
")")

# 3) 验证
SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success'))" 2>/dev/null)
if [ "$SUCCESS" = "True" ]; then
    echo "✅ Purge 成功:"
    echo "$RESP" | python3 -m json.tool | grep -E '"id":|"status":' | head -5
else
    echo "❌ Purge 失败:"
    echo "$RESP" | python3 -m json.tool
    exit 1
fi

echo ""
echo "💡 提示: 浏览器可能要 Ctrl+Shift+R 强制刷新才能拉到新 chunk"
echo "   或打开 DevTools → Network → Disable cache"