import { createClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const rawUrl = (env.VITE_SUPABASE_URL || '').trim();
const rawAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

const hasPlaceholder =
  !rawUrl ||
  !rawAnonKey ||
  rawUrl.includes('your-project.supabase.co') ||
  rawAnonKey.includes('your-supabase-anon-key');

export const isSupabaseConfigured = !hasPlaceholder;

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
