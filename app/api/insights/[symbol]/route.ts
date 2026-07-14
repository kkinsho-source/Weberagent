import { NextResponse } from 'next/server';
import { getDataBundle } from '@/lib/data/source';
import { fetchSymbolHistory } from '@/lib/etl/history';
import { fetchMonthlyRevenue, fetchQuarterlyEps } from '@/lib/data/financials';
import { buildRuleInsights } from '@/lib/data/insights';
import { fetchMopsAnnouncements } from '@/lib/data/mops';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/insights/[symbol]
 * 規則式 AI 洞察
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  try {
    const bundle = await getDataBundle({ symbol });
    const stock = bundle.stocks.find((s) => s.symbol === symbol) || bundle.stocks[0];
    if (!stock) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const [bars, revenues, epsList, mops] = await Promise.all([
      fetchSymbolHistory(symbol, 3),
      fetchMonthlyRevenue(symbol, 3).catch(() => []),
      fetchQuarterlyEps(symbol, 2).catch(() => []),
      fetchMopsAnnouncements({ symbol, limit: 8 }).catch(() => ({ items: [] as { title: string }[] })),
    ]);

    const insight = buildRuleInsights({
      stock,
      bars,
      mopsTitles: (mops.items || []).map((i: { title: string }) => i.title),
      revenueYoy: revenues.at(-1)?.yoyPct ?? null,
      epsLatest: epsList.at(-1)?.eps ?? null,
    });

    return NextResponse.json({
      symbol,
      stock: { name: stock.name, price: stock.price, changePct: stock.changePct, themeSlug: stock.themeSlug },
      insight,
      meta: {
        bars: bars.length,
        mops: (mops.items || []).length,
        revenues: revenues.length,
        eps: epsList.length,
        engine: 'rule-based-v1',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg, symbol }, { status: 500 });
  }
}
