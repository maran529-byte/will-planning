#!/bin/bash
# ============================================================
# AI Will Planner — Vercel 环境变量同步脚本
# 用途：把 .env.local 里的微信 MP 配置同步到 Vercel
# 前提：需要 VERCEL_TOKEN (https://vercel.com/account/tokens)
#       需要 VERCEL_PROJECT_ID 和 VERCEL_ORG_ID (在 Vercel 项目设置)
# ============================================================

set -e

# 必须设置这 3 个环境变量 (在 ~/.bash_profile 或命令行 export)
: "${VERCEL_TOKEN:?VERCEL_TOKEN 未设置, 请到 https://vercel.com/account/tokens 创建}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID 未设置, 请到 Vercel 项目 Settings → General 查看}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID 未设置, 请到 Vercel 项目 Settings → General 查看}"

V_AUTH="Authorization: Bearer ${VERCEL_TOKEN}"
V_BASE="https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env"

# 读取 .env.local 中的值
ENV_FILE="${ENV_FILE:-/Users/maran/aiwill-planner/.env.local}"
echo "📖 Reading from $ENV_FILE"

declare -A VALUES
while IFS='=' read -r key val; do
  case "$key" in
    WECHAT_MP_TOKEN|WECHAT_MP_AES_KEY|WECHAT_MP_ENCODING|WECHAT_MP_APP_ID|WECHAT_MP_APP_SECRET)
      # 跳过注释
      [[ "$val" =~ ^[[:space:]]*# ]] && continue
      VALUES[$key]="$val"
      echo "  $key = ${val:0:8}... (len=${#val})"
      ;;
  esac
done < "$ENV_FILE"

# 同步每个变量到 Vercel (覆盖现有值)
for KEY in "${!VALUES[@]}"; do
  VALUE="${VALUES[$KEY]}"
  ENCODED=$(printf '%s' "$VALUE" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))")
  echo ""
  echo "🔧 Setting $KEY on Vercel (production + preview)..."
  RESP=$(curl -sS -X PATCH "${V_BASE}/${KEY}?teamId=${VERCEL_ORG_ID}" \
    -H "$V_AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"value\":${ENCODED},\"target\":[\"production\",\"preview\"]}")
  if echo "$RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('id') == '$KEY' else 1)" 2>/dev/null; then
    echo "  ✅ $KEY set"
  else
    echo "  ❌ $KEY failed:"
    echo "$RESP" | python3 -m json.tool 2>/dev/null | head -10
  fi
done

echo ""
echo "============================================"
echo "✅ Done. Now trigger Vercel redeploy:"
echo "   cd /Users/maran/aiwill-planner"
echo "   git commit --allow-empty -m 'chore: redeploy with new env' && git push origin main"
echo "============================================"