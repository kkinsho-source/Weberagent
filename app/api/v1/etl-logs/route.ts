import { NextResponse } from 'next/server';
import { canUseSupabase, fetchRecentEtlLogs } from '@/lib/data/supabase-repo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/etl-logs — 最近 ETL 執行紀錄
 * 無 Supabase 時回傳 empty + configured:false
 */
export async function GET() {
  if (!canUseSupabase()) {
    return NextResponse.json({
      configured: false,
      logs: [],
      message: 'Supabase 未設定，請在 .env.local 填入 NEXT_PUBLIC_SUPABASE_URL / ANON_KEY',
    });
  }
  const logs = await fetchRecentEtlLogs(20);
  return NextResponse.json({ configured: true, logs });
}
