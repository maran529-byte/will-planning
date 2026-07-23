/**
 * host 工具函数
 *
 * 用途:
 *   - 同一份 Next.js 代码同时服务主站 (aiwill-planner.cn) 和 H5 (h5.aiwill-planner.cn)
 *   - 在 page.tsx 中通过 headers().get('host') + isH5Host() 决定渲染分支
 *   - 主站: 0 form 0 input 0 API 调用 (合规要求)
 *   - H5: 完整业务表单
 */

const H5_HOSTS = new Set([
  'h5.aiwill-planner.cn',
  'h5.localhost',
  'localhost:3001',
]);

const DEV_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
]);

export function isH5Host(host: string | null | undefined): boolean {
  if (!host) return false;
  const lower = host.toLowerCase().split(':')[0];
  if (H5_HOSTS.has(host.toLowerCase())) return true;
  if (H5_HOSTS.has(lower)) return true;
  // 本地开发: 端口 3001 / 3002 / 3003 视为 H5 (通常对应 H5 测试)
  if (DEV_HOSTS.has(lower)) {
    const port = host.split(':')[1];
    if (port && ['3001', '3002', '3003'].includes(port)) return true;
  }
  return host.toLowerCase().startsWith('h5.');
}

export function isMainlandHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return !isH5Host(host);
}
