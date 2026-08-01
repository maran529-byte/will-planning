/**
 * 安全的 returnTo 参数校验 (防止开放重定向)
 *
 * 用法:
 *   const target = safeReturnTo(searchParams.return, '/dashboard');
 *   router.push(target);
 *
 * 规则:
 *   - 必须以单个 '/' 开头 (相对路径)
 *   - 不能以 '//' 开头 (协议相对 URL, 例如 //evil.com 会被浏览器解析为 https://evil.com)
 *   - 不能含 '\'、'\r'、'\n' (header 注入 / CRLF 注入)
 *   - 长度 ≤ 2048 (合理上限)
 *   - 失败时返回 fallback
 *
 * 与 admin/login 的校验一致 (useEffect 内 startsWith('/') && !startsWith('//')),
 * 提取为公共 util 供 /login, /register, /wechat/success, /wechat/bind 共用.
 */

const MAX_LENGTH = 2048;

export function isSafeReturnPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.length > MAX_LENGTH) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false; // protocol-relative → 攻击者可绕过
  // 防止 CR/LF/反斜杠注入 (header smuggling)
  if (/[\r\n\\]/.test(value)) return false;
  return true;
}

export function safeReturnTo(value: unknown, fallback: string): string {
  return isSafeReturnPath(value) ? value : fallback;
}
