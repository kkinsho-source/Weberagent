/**
 * 從 twse_snapshot.json 讀取並 upsert 到 Supabase
 */
import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { stocks as mockStocks } from '@/lib/data/mock';
import type { Stock } from '@/lib/types';
import { upsertStockData, writeEtlLog, type StockUpsertInput } from '@/lib/data/upsert';

type Snapshot = {
  asOf: string;
  source: string;
  count: number;
  quotes: Record<string, { name: string; price: number; changePct: number }>;
};

export function loadTwseSnapshot(): Snapshot | null {
  try {
    const p = path.join(process.cwd(), 'lib', 'data', 'twse_snapshot.json');
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Snapshot;
  } catch {
    return null;
  }
}

/**
 * 把 snapshot 真實行情 + mock domain 屬性 合併後寫入 Supabase
 */
export async function migrateSnapshotToSupabase(opts?: {
  coreOnly?: boolean;
}): Promise<{ ok: boolean; message: string; stocks?: number; prices?: number }> {
  const snap = loadTwseSnapshot();
  if (!snap) {
    return { ok: false, message: '找不到 lib/data/twse_snapshot.json，請先 npm run etl:twse' };
  }

  const coreOnly = opts?.coreOnly !== false;
  const mockMap = new Map<string, Stock>(mockStocks.map((s) => [s.symbol, s]));
  const symbols = coreOnly ? mockStocks.map((s) => s.symbol) : Object.keys(snap.quotes);

  const rows: StockUpsertInput[] = [];
  for (const symbol of symbols) {
    const q = snap.quotes[symbol];
    if (!q) continue;
    const m = mockMap.get(symbol);
    rows.push({
      symbol,
      market: 'tw',
      name: q.name || m?.name || symbol,
      industry: m?.industry,
      themeSlug: m?.themeSlug,
      price: q.price,
      changePct: q.changePct,
      marketCap: m?.marketCap,
      asOf: snap.asOf,
    });
  }

  const result = await upsertStockData(rows, {
    writePrices: true,
    source: snap.source || 'TWSE STOCK_DAY_ALL',
  });

  await writeEtlLog({
    jobName: 'migrate_snapshot_to_supabase',
    status: result.ok ? 'success' : 'failed',
    source: snap.source,
    recordsCount: result.stocks,
    message: result.ok
      ? `stocks=${result.stocks} prices=${result.prices} asOf=${snap.asOf}`
      : result.error,
    meta: { asOf: snap.asOf, coreOnly },
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.error || 'upsert failed',
      stocks: result.stocks,
      prices: result.prices,
    };
  }
  return {
    ok: true,
    message: `已寫入 stocks=${result.stocks}, stock_prices=${result.prices}, asOf=${snap.asOf}`,
    stocks: result.stocks,
    prices: result.prices,
  };
}
