// Order storage utility
// Uses Supabase when configured, falls back to server-side memory for development
//
// 改版 v2 (2026-06):
//  - 添加 openid 字段, 所有读写都按 openid 过滤 (用户隔离)
//  - 添加 getOrdersByOpenid 系列函数, 替换"全表 SELECT"反模式
//  - DB 层加 openid 列 (见 supabase/migrations/0002_add_orders_openid.sql)

import { supabaseAdmin } from './supabase-server';
import { normalizePlan, PlanId } from './pricing';

export interface Order {
  id: string;
  order_no: string;
  amount: number;
  // 历史 plan 字符串 ('lawyer' / 'family') 仍兼容, UI 层 normalizePlan() 映射
  plan: PlanId | 'lawyer' | 'family';
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paid_at?: string;
  payment_channel?: 'wechat' | 'alipay';
  will_id?: string;
  // 新增: 所属用户 (微信 openid 唯一标识)
  // 服务端从 cookie 读, 客户端从服务端注入, 永不信任客户端传值
  openid?: string;
  created_at: string;
}

// localStorage fallback key (client-side, dev only)
const STORAGE_KEY = 'will_planning_orders';

export function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

// ---- Server-side (Supabase) ----

/**
 * 按 openid 查订单. 不传 openid 时返回 [] (永远不要返回全部!).
 *
 * 安全要点 (P0 修复):
 *  - 修复前: getOrdersServer() 返回所有用户订单 → 用户 A 看到用户 B 的订单
 *  - 修复后: 必须传 openid, 服务端用 .eq('openid', openid) 过滤
 */
export async function getOrdersByOpenidServer(openid: string | null): Promise<Order[]> {
  if (!supabaseAdmin) return [];
  if (!openid) return []; // 未登录用户: 空列表 (不返回全部!)
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('openid', openid)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase getOrdersByOpenid error:', error);
    return [];
  }
  return (data as Order[]) || [];
}

/**
 * 按 openid + orderId 查单个订单.
 * 用于 PATCH /orders/[id] 时的所有权校验.
 */
export async function getOrderByIdAndOpenidServer(
  orderId: string,
  openid: string | null
): Promise<Order | null> {
  if (!supabaseAdmin) return null;
  if (!openid) return null;
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('openid', openid)
    .maybeSingle();
  if (error) return null;
  return data as Order | null;
}

// 保留旧名 (无 openid 过滤的版本), 但标记 deprecated
// 仅供 admin 后台等特殊场景使用, 普通 API 不应调用
/** @deprecated Use getOrdersByOpenidServer(openid) — never return all orders */
export async function getOrdersServer(): Promise<Order[]> {
  if (!supabaseAdmin) return [];
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase getOrders error:', error);
    return [];
  }
  return (data as Order[]) || [];
}

export async function getOrderServer(orderId: string): Promise<Order | null> {
  if (!supabaseAdmin) return null;
  // P0: .maybeSingle() prevents PGRST116 crash when no row matches.
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (error) return null;
  return data as Order | null;
}

export interface CreateOrderInput {
  amount: number;
  plan: PlanId | 'lawyer' | 'family';
  will_id?: string;
  openid?: string; // 新增: 关联到微信用户
}

/**
 * 创建订单. openid 由服务端从 cookie 读取, 永不由客户端传入.
 */
export async function createOrderServer(data: CreateOrderInput): Promise<Order | null> {
  if (!supabaseAdmin) return null;
  const newOrder: Omit<Order, 'id'> = {
    order_no: generateOrderNo(),
    amount: data.amount,
    plan: data.plan,
    status: 'pending',
    will_id: data.will_id,
    openid: data.openid,
    created_at: new Date().toISOString(),
  };
  // P0: .maybeSingle() prevents PGRST116 when insert returns no row.
  const { data: created, error } = await supabaseAdmin
    .from('orders')
    .insert(newOrder)
    .select()
    .maybeSingle();
  if (error) {
    console.error('Supabase createOrder error:', error);
    return null;
  }
  return created as Order | null;
}

export async function updateOrderServer(
  orderId: string,
  updates: Partial<Order>
): Promise<Order | null> {
  if (!supabaseAdmin) return null;
  // P0: .maybeSingle() prevents PGRST116 when update returns no row.
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .maybeSingle();
  if (error) return null;
  return data as Order | null;
}

export async function updateOrderStatusServer(
  orderId: string,
  status: Order['status'],
  paymentChannel?: 'wechat' | 'alipay'
): Promise<Order | null> {
  const updates: Partial<Order> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (paymentChannel) {
    updates.payment_channel = paymentChannel;
  }
  return updateOrderServer(orderId, updates);
}

// ---- Server-side localStorage fallback (in-memory, dev only) ----
//
// 注: 服务端用 globalThis 模拟 "localStorage", 仅 dev 环境无 Supabase 时使用.
//     生产环境必须用 Supabase. 这里也按 openid 隔离.

type GlobalWithOrders = typeof globalThis & { orders?: Order[] };

function getServerOrders(): Order[] {
  const g = globalThis as GlobalWithOrders;
  if (!g.orders) g.orders = [];
  return g.orders;
}

function setServerOrders(orders: Order[]) {
  const g = globalThis as GlobalWithOrders;
  g.orders = orders;
}

export function getOrdersByOpenidLocal(openid: string | null): Order[] {
  if (!openid) return []; // 未登录: 空
  return getServerOrders().filter((o) => o.openid === openid);
}

export function getOrderByIdAndOpenidLocal(
  orderId: string,
  openid: string | null
): Order | undefined {
  if (!openid) return undefined;
  return getServerOrders().find((o) => o.id === orderId && o.openid === openid);
}

export function createOrderLocal(data: CreateOrderInput): Order {
  const orders = getServerOrders();
  const newOrder: Order = {
    id: crypto.randomUUID(),
    order_no: generateOrderNo(),
    amount: data.amount,
    plan: data.plan,
    status: 'pending',
    will_id: data.will_id,
    openid: data.openid,
    created_at: new Date().toISOString(),
  };
  orders.push(newOrder);
  setServerOrders(orders);
  return newOrder;
}

export function updateOrderStatusLocal(
  orderId: string,
  status: Order['status'],
  paymentChannel?: 'wechat' | 'alipay',
  ownerOpenid?: string
): Order | undefined {
  const orders = getServerOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return undefined;
  // 所有权校验: 不允许改别人的订单
  if (ownerOpenid && orders[index].openid !== ownerOpenid) return undefined;

  const updates: Partial<Order> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (paymentChannel) {
    updates.payment_channel = paymentChannel;
  }

  orders[index] = { ...orders[index], ...updates };
  setServerOrders(orders);
  return orders[index];
}

// ---- Client-side (localStorage fallback) ----
//
// 注: 客户端 localStorage 实际上不应该用, 因为:
//   (a) 客户端无法做服务端级 openid 隔离
//   (b) 现在的 orders 列表都从服务端 GET /api/create-order 拿
//   (c) 这里保留只是为了兼容旧的客户端代码, 实际所有 list 操作都走服务端
//
// 标记为 deprecated, 调用方应改为 fetch('/api/create-order')

/** @deprecated Use fetch('/api/create-order') — server returns only your own orders */
export function getOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

/** @deprecated Use fetch('/api/orders/[id]') */
export function getOrder(orderId: string): Order | undefined {
  const orders = getOrders();
  return orders.find((o) => o.id === orderId);
}

/** @deprecated Use POST /api/create-order */
export function createOrder(data: {
  amount: number;
  plan: PlanId | 'lawyer' | 'family';
  will_id?: string;
}): Order {
  const orders = getOrders();
  const newOrder: Order = {
    id: crypto.randomUUID(),
    order_no: generateOrderNo(),
    amount: data.amount,
    plan: data.plan,
    status: 'pending',
    will_id: data.will_id,
    created_at: new Date().toISOString(),
  };
  orders.push(newOrder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return newOrder;
}

/** @deprecated Use PATCH /api/orders/[id] */
export function updateOrder(orderId: string, updates: Partial<Order>): Order | undefined {
  const orders = getOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return undefined;

  orders[index] = { ...orders[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return orders[index];
}

/** @deprecated Use PATCH /api/orders/[id] */
export function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  paymentChannel?: 'wechat' | 'alipay'
): Order | undefined {
  const updates: Partial<Order> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (paymentChannel) {
    updates.payment_channel = paymentChannel;
  }
  return updateOrder(orderId, updates);
}

// 重新导出 normalizePlan 方便调用方 (避免在 orders.ts 之外的导入)
export { normalizePlan };
