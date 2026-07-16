import { NextResponse } from 'next/server';
import { fetchCompanyProfile, fetchValuation } from '@/lib/data/company';
import { fetchIncomeQuarters } from '@/lib/data/income';
import { etfsHolding } from '@/lib/data/etf';
import { fetchStockNews } from '@/lib/data/news';
import { getDataBundle } from '@/lib/data/source';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/stock-profile/[symbol]
 * 基本資料 + 估值 + 損益季報 + ETF + 外鏈新聞
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  const bundle = await getDataBundle();
  const stock = bundle.stocks.find((s) => s.symbol === symbol);

  const [profile, valuation, income, news] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchValuation(symbol),
    fetchIncomeQuarters(symbol, 8),
    fetchStockNews(symbol, stock?.name || symbol, 8),
  ]);

  return NextResponse.json({
    symbol,
    stock: stock || null,
    profile,
    valuation,
    income,
    etfs: etfsHolding(symbol),
    news,
  });
}
