import { NextResponse } from 'next/server';
import { fetchMonthlyRevenue, fetchQuarterlyEps } from '@/lib/data/financials';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/financials/[symbol]
 * 月營收 + 季 EPS（證交所 OpenAPI）
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  try {
    const [revenues, eps] = await Promise.all([
      fetchMonthlyRevenue(symbol, 12),
      fetchQuarterlyEps(symbol, 8),
    ]);
    return NextResponse.json({
      symbol,
      dataSource: 'TWSE OpenAPI t187ap05_L + t187ap14_L',
      revenues,
      eps,
      count: { revenues: revenues.length, eps: eps.length },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, symbol }, { status: 502 });
  }
}
