import { NextResponse } from 'next/server';
import { fetchMopsAnnouncements } from '@/lib/data/mops';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/mops?symbol=2330&from=2026-01-01&to=2026-07-14&q=子公司&limit=50
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 50), 200);

  const result = await fetchMopsAnnouncements({ symbol, from, to, q, limit });
  return NextResponse.json({
    items: result.items,
    dataSource: result.dataSource,
    totalHint: result.totalHint,
    filters: { symbol, from, to, q, limit },
  });
}
