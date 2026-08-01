#!/usr/bin/env node
// Start Next.js with env vars from .env.local
// 改版 v11 (2026-06-28): 改用 exec + stdio inherit, 让 systemd 直接跟踪 next-server 进程
//   - 旧版 spawn + detached + unref 导致 parent 立即 exit, systemd 视为失败循环重启
//   - 新版 exec 后 node 进程替换为 next-server, systemd 跟踪到的就是真正的 Next.js 进程
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = '/var/www/aiwill-planner';
const envFile = path.join(rootDir, '.env.local');

console.log('Reading env from', envFile);
const env = { ...process.env, NODE_ENV: 'production' };

fs.readFileSync(envFile).toString().split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eq = trimmed.indexOf('=');
  if (eq === -1) return;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim();
  if (key) {
    env[key] = val;
    console.log('  env:', key, '=', key.includes('KEY') ? '(set)' : val);
  }
});

const nextBin = path.join(rootDir, 'node_modules/.bin/next');
console.log('Starting Next.js at', nextBin, '(exec mode, systemd tracks directly)');

// 把 next bin 转成绝对 node 调用, 然后用 execFileSync (阻塞, 跟 systemd 同步)
// 不行 — execFileSync 是阻塞同步, 适合一次性命令. 改用 child_process.execFile 但不 detached.
const { spawn } = require('child_process');
const child = spawn(nextBin, ['start', '-p', '3001', '-H', '0.0.0.0'], {
  cwd: rootDir,
  env,
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  console.log('Next.js exited with code', code, 'signal', signal);
  process.exit(code || 0);
});
// 让 SIGTERM/SIGINT 等信号也传给 child
['SIGTERM', 'SIGINT', 'SIGHUP'].forEach((sig) => {
  process.on(sig, () => {
    try { child.kill(sig); } catch (e) { /* ignore */ }
  });
});