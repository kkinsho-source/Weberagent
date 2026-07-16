import { NextResponse } from 'next/server';
import { fetchCompanyProfile, fetchValuation } from '@/lib/data/company';
import {
  fetchIncomeQuarters,
  fetchBalanceQuarters,
  fetchCashflowQuarters,
} from '@/lib/data/income';
import { etfsHolding } from '@/lib/data/etf';
import { fetchStockNews } from '@/lib/data/news';
import { getDataBundle } from '@/lib/data/source';
import { fetchMonthlyRevenue, fetchQuarterlyEps } from '@/lib/data/financials';
import { companyExtraOf } from '@/lib/data/company-extra';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/stock-profile/[symbol]
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await ctx.params;
  const bundle = await getDataBundle();
  const stock = bundle.stocks.find((s) => s.symbol === symbol);
  let theme = bundle.themes.find((t) => t.slug === stock?.themeSlug) || null;
  // T1 display guard：slug 保留，標題統一記憶體
  if (theme?.slug === 'memory_hbm' && theme.title !== '記憶體') {
    theme = { ...theme, title: '記憶體' };
  }
  const peers = stock
    ? bundle.stocks
        .filter((s) => s.themeSlug === stock.themeSlug && s.symbol !== stock.symbol)
        .slice(0, 12)
    : [];

  const [profile, valuation, income, balance, cashflow, news, revenues, eps] =
    await Promise.all([
      fetchCompanyProfile(symbol),
      fetchValuation(symbol),
      fetchIncomeQuarters(symbol, 8),
      fetchBalanceQuarters(symbol, 8),
      fetchCashflowQuarters(symbol, 8),
      fetchStockNews(symbol, stock?.name || symbol, 8),
      fetchMonthlyRevenue(symbol, 6).catch(() => []),
      fetchQuarterlyEps(symbol, 4).catch(() => []),
    ]);

  const extra = companyExtraOf(symbol);

  return NextResponse.json({
    symbol,
    stock: stock || null,
    theme: theme || null,
    peers,
    profile: profile
      ? { ...profile, product: extra.product || null, website: extra.website || null }
      : extra.product || extra.website
        ? {
            symbol,
            product: extra.product || null,
            website: extra.website || null,
            dataSource: 'editorial',
          }
        : null,
    valuation,
    income,
    balance,
    cashflow,
    etfs: etfsHolding(symbol),
    news,
    highlight: {
      lastRevenue: revenues.at(-1) || null,
      lastEps: eps.at(-1) || null,
    },
  });
}
