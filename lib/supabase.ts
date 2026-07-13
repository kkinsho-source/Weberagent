/**
 * 共用 Supabase 入口（需求指定 lib/supabase.ts）
 * 實際實作分散在 lib/supabase/*，此檔統一 re-export 方便 import。
 *
 * 使用方式：
 *   import { getSupabaseBrowserClient, getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase'
 */
export {
  getSupabaseBrowserClient,
  getSupabaseClient,
  isSupabaseBrowserConfigured,
} from './supabase/client';

export {
  getSupabaseServerClient,
  getSupabaseAuthServerClient,
  isSupabaseConfigured,
} from './supabase/server';

export {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from './supabase/admin';
