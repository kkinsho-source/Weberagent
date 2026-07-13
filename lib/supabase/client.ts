import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// 環境變數在 .env.local 中設定（見 .env.example）
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

// 僅在瀏覽器端且已設定環境變數時建立 client，避免 SSR 報錯
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}
