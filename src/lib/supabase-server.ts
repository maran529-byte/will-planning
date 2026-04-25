import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config';

// Admin client for server-side operations (bypasses RLS)
// Only created when SERVICE_ROLE_KEY is configured
export const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Helper to check if admin client is configured
export const isSupabaseAdminConfigured = () => !!supabaseAdmin;
