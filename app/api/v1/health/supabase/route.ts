import { NextResponse } from 'next/server';
import { canUseSupabase } from '@/lib/data/supabase-repo';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/health/supabase
 * 檢查 env 與 stocks 表連線狀態（不暴露 key）
 */
export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!canUseSupabase()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      env: { hasUrl, hasAnon, hasService },
      message: '缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY',
    });
  }

  const sb = getSupabaseServerClient();
  try {
    const { count, error } = await sb!
      .from('stocks')
      .select('*', { count: 'exact', head: true });
    if (error) {
      return NextResponse.json({
        ok: false,
        configured: true,
        env: { hasUrl, hasAnon, hasService },
        error: error.message,
        message: '連線成功但查詢失敗（可能尚未執行 schema.sql）',
      });
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      env: { hasUrl, hasAnon, hasService },
      stocksCount: count ?? 0,
      message: 'Supabase 連線正常',
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      configured: true,
      env: { hasUrl, hasAnon, hasService },
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
