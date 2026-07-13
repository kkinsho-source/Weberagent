import { NextResponse } from 'next/server';
import { stocks, getStock, getStocksByTheme, getSnapshotMeta } from '@/lib/data/source';

// 行情類 API 不預渲染，永遠即時
export const dynamic = 'force-dynamic';

/**
 * BFF 路由 — 個股 / 題材資料縫合出口
 * GET /api/v1/stocks              -> 全部個股（真實報價已覆蓋）
 * GET /api/v1/stocks?symbol=2330  -> 單檔個股
 * GET /api/v1/stocks?theme=foundry-> 某題材下全部個股
 *
 * 前端未來用 TanStack Query 輪詢此路由即可拿到即時報價；
 * 上 Supabase 後，source.ts 改從 DB 讀，本路由免改。
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const theme = searchParams.get('theme');

  if (symbol) {
    const s = getStock(symbol);
    if (!s) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ stock: s, meta: getSnapshotMeta() });
  }

  if (theme) {
    return NextResponse.json({ theme, stocks: getStocksByTheme(theme), meta: getSnapshotMeta() });
  }

  return NextResponse.json({ stocks, meta: getSnapshotMeta() });
}
