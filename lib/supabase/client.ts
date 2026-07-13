/**
 * 瀏覽器端 Supabase client（Auth / 即時訂閱用）
 * 僅在 window 存在且 env 已設定時建立，避免 SSR 崩潰。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (typeof window === 'undefined') return null;
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey);
  }
  return browserClient;
}

/** @deprecated 使用 getSupabaseBrowserClient */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  return getSupabaseBrowserClient();
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(url && anonKey);
}
