import { NextResponse } from 'next/server';
import { getDataBundle } from '@/lib/data/source';
import { filterThemesByScope, parseThemeScope, type ThemeScope } from '@/lib/data/theme-scope';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks
 * GET /api/stocks?symbol=2330
 * GET /api/stocks?theme=foundry
 * GET /api/stocks?scope=ai|all|tier0|defensive|cyclical
 *
 * 統一走 getDataBundle（含 Q1 stock_prices 報價 overlay）
 * scope：依題材 tier/family 過濾成分股（該 theme 下的 stocks）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') ?? undefined;
  const theme = searchParams.get('theme') ?? undefined;
  const scopeParam = searchParams.get('scope');
  const scope: ThemeScope | null = scopeParam ? parseThemeScope(scopeParam, 'all') : null;

  try {
    const bundle = await getDataBundle({ symbol, theme });

    if (symbol) {
      const stock = bundle.stocks.find((s) => s.symbol === symbol) || bundle.stocks[0];
      if (!stock) {
        return NextResponse.json(
          { error: 'not_found', dataSource: bundle.dataSource },
          { status: 404 },
        );
      }
      return NextResponse.json({
        stock,
        dataSource: bundle.dataSource,
        meta: bundle.meta,
        count: 1,
      });
    }

    let stocks = bundle.stocks;
    if (scope) {
      const allowed = new Set(filterThemesByScope(bundle.themes, scope).map((t) => t.slug));
      stocks = stocks.filter((s) => allowed.has(s.themeSlug));
    }

    return NextResponse.json({
      stocks,
      dataSource: bundle.dataSource,
      meta: bundle.meta,
      count: stocks.length,
      scope: scope ?? undefined,
    });
  } catch (e) {
    console.error('[api/stocks]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
