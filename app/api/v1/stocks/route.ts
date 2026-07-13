import { NextResponse } from 'next/server';
import { getDataBundle } from '@/lib/data/source';
import { canUseSupabase, fetchRecentEtlLogs } from '@/lib/data/supabase-repo';

export const dynamic = 'force-dynamic';

/**
 * BFF — 個股資料
 * GET /api/v1/stocks
 * GET /api/v1/stocks?symbol=2330
 * GET /api/v1/stocks?theme=foundry
 *
 * 回傳 dataSource: 'supabase' | 'snapshot' | 'mock'
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') ?? undefined;
  const theme = searchParams.get('theme') ?? undefined;

  const bundle = await getDataBundle({ symbol, theme });

  let etl: unknown[] = [];
  if (canUseSupabase()) {
    etl = await fetchRecentEtlLogs(3);
  }

  if (symbol) {
    const stock = bundle.stocks[0];
    if (!stock) {
      return NextResponse.json(
        { error: 'not_found', dataSource: bundle.dataSource },
        { status: 404 }
      );
    }
    return NextResponse.json({
      stock,
      meta: bundle.meta,
      dataSource: bundle.dataSource,
      recentEtl: etl,
    });
  }

  return NextResponse.json({
    stocks: bundle.stocks,
    meta: bundle.meta,
    dataSource: bundle.dataSource,
    recentEtl: etl,
  });
}
