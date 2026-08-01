#!/bin/bash
# ============================================================
# AI Will Planner — Cloudflare CDN 缓存清理 + Cache Rule 配置
# 用途 ：h5.aiwill-planner.cn 的 _next/static/chunks/ 旧 chunk
#        经常被 Cloudflare 缓存 (max-age=2592000), 即使 Vercel
#        已重新部署, 浏览器仍拉到旧 JS, 导致用户看到旧 UI
#        (例如老的手机号登录 tab).
#
# 用法 ：
#   1) 从 Cloudflare Dashboard → My Profile → API Tokens
#      创建 Token, 权限:
#        Zone → Cache Purge: Edit
#        Zone → Cache Rules: Edit
#        Zone → Settings: Read (或 Zone: Read)
#   2) 在 ~/.zshrc 或 ~/.bash_profile 加入:
#         export CF_API_TOKEN="你的token"
#         export CF_ZONE_ID="你的zone id"   # aiwill-planner.cn
#   3) bash purge_cloudflare.sh
#      或仅建立 cache rule (推荐部署一次):
#         bash purge_cloudflare.sh rule
#      或仅 purge 当前 URL (推荐每次部署后):
#         bash purge_cloudflare.sh purge
# ============================================================

set -e

CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_ZONE_NAME="${CF_ZONE_NAME:-aiwill-planner.cn}"
ACTION="${1:-all}"

if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ]; then
    echo "❌ 缺少环境变量 CF_API_TOKEN 或 CF_ZONE_ID"
    echo "   请先在 ~/.zshrc 加上:"
    echo "     export CF_API_TOKEN=\"你的token\""
    echo "     export CF_ZONE_ID=\"你的zone id\""
    echo "   然后 source ~/.zshrc 再执行此脚本"
    exit 1
fi

cf_api() {
    curl -sS "$1" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        "${@:2}"
}

# =================================================================
# 1) 加 Cache Rule: /_next/static/* Bypass Cache
#    一劳永逸 — 以后部署再也不会被缓存旧 chunk
# =================================================================
add_cache_rule() {
    echo "==== Adding Cache Rule: bypass /_next/static/* ===="
    RESP=$(cf_api "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint" \
        -X PUT \
        --data "$(cat <<'JSON'
{
  "rules": [
    {
      "description": "Vercel 静态 chunk — 不缓存, 让每次部署立即生效",
      "expression": "(http.host eq \"h5.aiwill-planner.cn\" and http.request.uri.path starts_with \"/_next/static/\")",
      "action": "set_cache_settings",
      "action_parameters": {
        "cache": false,
        "bypass_cache": true,
        "edge_ttl": { "mode": "bypass" },
        "browser_ttl": { "mode": "respect_origin" }
      }
    }
  ]
}
JSON
)")
    SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success'))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
        echo "✅ Cache Rule 已加: h5 子域 _next/static/* 不再缓存"
        echo "$RESP" | python3 -m json.tool | head -20
    else
        echo "❌ Cache Rule 添加失败:"
        echo "$RESP" | python3 -m json.tool
        return 1
    fi
}

# =================================================================
# 2) Purge 当前 _next/static/chunks/ 路径
#    立刻让浏览器拉到新 chunk (无需等 cache rule 生效)
# =================================================================
purge_static() {
    echo "==== Purge h5.aiwill-planner.cn _next/static/* ===="

    # 用 prefix purge: 删所有 _next/static/* 资源
    RESP=$(cf_api "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
        -X POST \
        --data '{"prefixes": ["h5.aiwill-planner.cn/_next/static/"]}')

    SUCCESS=$(echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('success'))" 2>/dev/null)
    if [ "$SUCCESS" = "True" ]; then
        echo "✅ Prefix purge 成功: h5.aiwill-planner.cn/_next/static/*"
        echo "$RESP" | python3 -m json.tool | grep -E '"id":' | head -3
    else
        echo "❌ Prefix purge 失败:"
        echo "$RESP" | python3 -m json.tool
        return 1
    fi

    # 也 purge 主页 HTML (可能缓存了)
    PAGES_RESP=$(cf_api "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
        -X POST \
        --data '{"files": [
            "https://h5.aiwill-planner.cn/login",
            "https://h5.aiwill-planner.cn/register",
            "https://h5.aiwill-planner.cn/account",
            "https://h5.aiwill-planner.cn/orders"
        ]}')
    echo "✅ 页面级 purge 完成"
}

# =================================================================
# 主流程
# =================================================================
case "$ACTION" in
    rule)   add_cache_rule ;;
    purge)  purge_static ;;
    all|*)
        add_cache_rule
        echo ""
        purge_static
        ;;
esac

echo ""
echo "💡 提示:"
echo "  - 浏览器可能要 Ctrl+Shift+R 强制刷新才能拉到新 chunk"
echo "  - 部署完推荐跑: bash purge_cloudflare.sh purge"