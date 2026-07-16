import { NextResponse } from 'next/server';
import { fetchInstitutional } from '@/lib/data/institutional';

export const dynamic = 'force-dynamic';

/** GET /api/institutional/[symbol]?start=2026-01-01 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  const start = new URL(req.url).searchParams.get('start') || undefined;
  const data = await fetchInstitutional(symbol, start || undefined);
  return NextResponse.json({
    symbol,
    dataSource: 'FinMind TaiwanStockInstitutionalInvestorsBuySell',
    items: data,
    count: data.length,
  });
}
