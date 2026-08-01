import { createClient } from '@supabase/supabase-js';
import { SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY } from './config';

// Admin client for server-side operations (bypasses RLS)
// Only created when SERVICE_ROLE_KEY is configured
// 使用 SUPABASE_INTERNAL_URL (服务端专走 127.0.0.1:8000, 避免公网 NAT 回环超时)
export const supabaseAdmin = SUPABASE_INTERNAL_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_INTERNAL_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Helper to check if admin client is configured
export const isSupabaseAdminConfigured = () => !!supabaseAdmin;
