// Order storage utility
// Uses Supabase when configured, falls back to localStorage for development

import { supabaseAdmin } from './supabase-server';

export interface Order {
  id: string;
  order_no: string;
  amount: number;
  plan: 'ai' | 'lawyer' | 'family';
  status: 'pending' | 'paid' | 'refunded' | 'cancelled';
  paid_at?: string;
  payment_channel?: 'wechat' | 'alipay';
  will_id?: string;
  created_at: string;
}

// localStorage fallback for development
const STORAGE_KEY = 'will_planning_orders';

export function generateOrderNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD${timestamp}${random}`;
}

// ---- Server-side (Supabase) ----

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
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (error) return null;
  return data as Order;
}

export async function createOrderServer(data: {
  amount: number;
  plan: 'ai' | 'lawyer' | 'family';
  will_id?: string;
}): Promise<Order | null> {
  if (!supabaseAdmin) return null;
  const newOrder: Omit<Order, 'id'> = {
    order_no: generateOrderNo(),
    amount: data.amount,
    plan: data.plan,
    status: 'pending',
    will_id: data.will_id,
    created_at: new Date().toISOString(),
  };
  const { data: created, error } = await supabaseAdmin
    .from('orders')
    .insert(newOrder)
    .select()
    .single();
  if (error) {
    console.error('Supabase createOrder error:', error);
    return null;
  }
  return created as Order;
}

export async function updateOrderServer(
  orderId: string,
  updates: Partial<Order>
): Promise<Order | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();
  if (error) return null;
  return data as Order;
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

// ---- Client-side (localStorage fallback) ----

export function getOrders(): Order[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getOrder(orderId: string): Order | undefined {
  const orders = getOrders();
  return orders.find(o => o.id === orderId);
}

export function createOrder(data: {
  amount: number;
  plan: 'ai' | 'lawyer' | 'family';
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

export function updateOrder(orderId: string, updates: Partial<Order>): Order | undefined {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) return undefined;

  orders[index] = { ...orders[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  return orders[index];
}

export function updateOrderStatus(orderId: string, status: Order['status'], paymentChannel?: 'wechat' | 'alipay'): Order | undefined {
  const updates: Partial<Order> = { status };
  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }
  if (paymentChannel) {
    updates.payment_channel = paymentChannel;
  }
  return updateOrder(orderId, updates);
}
