import { NextResponse } from 'next/server';
import { fetchValuationSeries } from '@/lib/data/valuation-series';

export const dynamic = 'force-dynamic';

/** GET /api/valuation/[symbol]?months=6 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  const months = Math.min(Number(new URL(req.url).searchParams.get('months') || 6), 24);
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const start = d.toISOString().slice(0, 10);
  const items = await fetchValuationSeries(symbol, start);
  return NextResponse.json({
    symbol,
    dataSource: 'FinMind TaiwanStockPER',
    items,
    count: items.length,
    lastDate: items.at(-1)?.date || null,
  });
}
