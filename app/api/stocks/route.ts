import { NextResponse } from 'next/server';
import { getDataBundle } from '@/lib/data/source';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stocks
 * GET /api/stocks?symbol=2330
 * GET /api/stocks?theme=foundry
 *
 * 統一走 getDataBundle（含 Q1 stock_prices 報價 overlay）
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') ?? undefined;
  const theme = searchParams.get('theme') ?? undefined;

  try {
    const bundle = await getDataBundle({ symbol, theme });

    if (symbol) {
      const stock = bundle.stocks.find((s) => s.symbol === symbol) || bundle.stocks[0];
      if (!stock) {
        return NextResponse.json(
          { error: 'not_found', dataSource: bundle.dataSource },
          { status: 404 }
        );
      }
      return NextResponse.json({
        stock,
        dataSource: bundle.dataSource,
        meta: bundle.meta,
        count: 1,
      });
    }

    return NextResponse.json({
      stocks: bundle.stocks,
      dataSource: bundle.dataSource,
      meta: bundle.meta,
      count: bundle.stocks.length,
    });
  } catch (e) {
    console.error('[api/stocks]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
