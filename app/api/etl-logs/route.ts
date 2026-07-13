import { NextResponse } from 'next/server';
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/etl-logs?limit=20
 * 取得資料更新紀錄（除錯用）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      logs: [],
      message: 'Supabase 未設定。填入 .env.local 後可查詢 etl_logs。',
    });
  }

  const sb = getSupabaseServerClient();
  if (!sb) {
    return NextResponse.json({ configured: false, logs: [] });
  }

  const { data, error } = await sb
    .from('etl_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({
      configured: true,
      logs: [],
      error: error.message,
      message: '查詢失敗（可能尚未執行 core_tables.sql）',
    });
  }

  return NextResponse.json({ configured: true, logs: data ?? [], count: data?.length ?? 0 });
}
