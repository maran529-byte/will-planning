#!/bin/bash
# ============================================================
# AI Will Planner — 合规 7 项证据自查脚本
# 用法 ：bash compliance_check.sh
# 退出 ：0 = 全过；>=1 = 有项目未通过
# 依据 ：aiwill-planner_合规手册.docx 第二篇
# ============================================================

set +e

MAINLAND_HOST="aiwill-planner.cn"
HK_API_HOST="api.aiwill-planner.cn"
HK_H5_HOST="h5.aiwill-planner.cn"
MAINLAND_IP="124.222.215.107"
HK_IP="43.129.207.154"
BEIAN="沪ICP备2026020925号-1"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; FAILS=$((FAILS+1)); }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
sect() { echo ""; echo "==== $1 ===="; }

FAILS=0

# ============================================================
sect "证据 1：大陆节点不出现 AI 推理 endpoint"
# ============================================================
for path in "" "/faq" "/compare" "/tool"; do
    body=$(curl -s --max-time 10 "https://${MAINLAND_HOST}${path}" 2>/dev/null)
    if echo "$body" | grep -qiE "anthropic|openai|deepseek|qwen|spark|/v1/(chat|completions|messages)"; then
        fail "大陆节点 ${path} 命中 AI endpoint 字符串"
    else
        pass "大陆节点 ${path} 无 AI endpoint 字符串"
    fi
done

# ============================================================
sect "证据 2：大陆 nginx 不反代境外"
# ============================================================
# 通过 curl + 看 X-Beian 头 + 检查 /api/ 是否 301 / 404 而不是反代
api_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "https://${MAINLAND_HOST}/api/v1/health" 2>/dev/null)
if [[ "$api_status" == "200" ]]; then
    fail "大陆节点 /api/v1/health 返回 200（疑似仍在反代）"
elif [[ "$api_status" == "301" ]] || [[ "$api_status" == "302" ]]; then
    pass "大陆节点 /api/* 已 ${api_status} 重定向（合规）"
elif [[ "$api_status" == "404" ]]; then
    pass "大陆节点 /api/* 已彻底切断（404）"
else
    warn "大陆节点 /api/* 返回 ${api_status}（请人工确认）"
fi

# ============================================================
sect "证据 3：H5 / 前端 JS 所有 fetch 目标域名为 api.aiwill-planner.cn"
# ============================================================
h5_body=$(curl -s --max-time 10 "https://${HK_H5_HOST}/" 2>/dev/null)
if echo "$h5_body" | grep -qE "fetch\(['\"]https?://(?!api\.aiwill-planner\.cn)"; then
    fail "H5 站发现非 api.aiwill-planner.cn 的 fetch 目标"
else
    pass "H5 站 fetch 目标符合规范"
fi
if echo "$h5_body" | grep -qiE "vercel\.app"; then
    fail "H5 站仍包含 vercel.app 字符串"
else
    pass "H5 站无 vercel.app 残留"
fi

# ============================================================
sect "证据 4：内容性质说明 + 备案号 Footer 全站 100% 覆盖"
# ============================================================
# 2026-06-19 改版: footer 标题从"法律免责声明"调整为"内容性质说明" (符合品牌定位,
# 避免"法律"字样). 脚本同时兼容旧关键字, 任何一项命中即视为合规.
for url in "https://${MAINLAND_HOST}/" \
           "https://${MAINLAND_HOST}/faq" \
           "https://${MAINLAND_HOST}/compare" \
           "https://${MAINLAND_HOST}/tool"; do
    body=$(curl -s --max-time 10 "$url" 2>/dev/null)
    if echo "$body" | grep -qE "内容性质说明|法律免责声明|免责声明"; then
        pass "${url} 包含免责声明"
    else
        fail "${url} 缺免责声明"
    fi
    if echo "$body" | grep -q "${BEIAN}"; then
        pass "${url} 包含备案号"
    else
        fail "${url} 缺备案号 ${BEIAN}"
    fi
done

# ============================================================
sect "证据 5：备案号全站可点击到工信部"
# ============================================================
for url in "https://${MAINLAND_HOST}/" "https://${MAINLAND_HOST}/faq"; do
    body=$(curl -s --max-time 10 "$url" 2>/dev/null)
    if echo "$body" | grep -q "beian.miit.gov.cn"; then
        pass "${url} 备案号已链接到 beian.miit.gov.cn"
    else
        fail "${url} 备案号未链接到工信部"
    fi
done

# ============================================================
sect "证据 6：所有 AI 规划按钮 href 解析到的最终 IP 不在大陆 ASN"
# ============================================================
index_body=$(curl -s --max-time 10 "https://${MAINLAND_HOST}/" 2>/dev/null)
# 任何 <a> href 指向 h5 子域即视为合规 (覆盖 btn-primary/btn-secondary/wx-follow 等类名)
if echo "$index_body" | grep -qE 'href="https://h5\.aiwill-planner\.cn'; then
    pass "首页 CTA 按钮指向 h5.aiwill-planner.cn"
    # 进一步：dig h5
    h5_resolved_ip=$(dig +short "${HK_H5_HOST}" | head -n1)
    if [[ "$h5_resolved_ip" == "$HK_IP" ]]; then
        pass "h5.aiwill-planner.cn 解析到香港 IP ${HK_IP}"
    else
        warn "h5.aiwill-planner.cn 解析到 ${h5_resolved_ip}（预期 ${HK_IP}）"
    fi
elif echo "$index_body" | grep -qiE 'vercel\.app|aiwill-planner\.com'; then
    fail "首页 CTA 仍指向 vercel/旧域名"
else
    fail "首页 CTA 按钮 href 异常"
fi

# ============================================================
sect "证据 7：ICP 调查表与实际经营内容一致"
# ============================================================
# 人工核对项，脚本只能提示
warn "证据 7 为人工核对项：请确认 ICP 备案表填写的经营范围 = 婚姻/遗嘱文书模板智能生成参考服务（非 AI 推理）"

# ============================================================
sect "汇总"
# ============================================================
if [[ $FAILS -eq 0 ]]; then
    echo -e "${GREEN}所有自动项通过 ✅${NC}"
    exit 0
else
    echo -e "${RED}${FAILS} 项未通过 ❌${NC}"
    exit 1
fi
