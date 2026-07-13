import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Stock, Theme, SupplyEdge } from '../types';
import {
  themes as mockThemes,
  stocks as mockStocks,
  supplyEdges as mockEdges,
} from './mock';
import {
  canUseSupabase,
  fetchStocksFromSupabase,
  fetchThemesFromSupabase,
  fetchEdgesFromSupabase,
} from './supabase-repo';

/**
 * 單一資料縫合層
 * DATA_MODE: mock | snapshot | supabase | auto(預設)
 * auto: 有 Supabase 且 DB 有資料 → supabase；否則 snapshot；再否則 mock
 */

export type DataSource = 'supabase' | 'snapshot' | 'mock';

const MODE = (process.env.DATA_MODE || 'auto').toLowerCase();

interface SnapshotQuote {
  name: string;
  price: number;
  changePct: number;
}
interface Snapshot {
  asOf: string;
  source: string;
  count: number;
  quotes: Record<string, SnapshotQuote>;
}

export interface DataBundle {
  stocks: Stock[];
  themes: Theme[];
  supplyEdges: SupplyEdge[];
  dataSource: DataSource;
  meta: { asOf?: string; source?: string; count?: number } | null;
}

let snapshotCache: Snapshot | null | undefined;

function loadSnapshot(): Snapshot | null {
  if (snapshotCache !== undefined) return snapshotCache;
  try {
    const p = path.join(process.cwd(), 'lib', 'data', 'twse_snapshot.json');
    snapshotCache = fs.existsSync(p)
      ? (JSON.parse(fs.readFileSync(p, 'utf-8')) as Snapshot)
      : null;
  } catch {
    snapshotCache = null;
  }
  return snapshotCache;
}

function overlayFromSnapshot(stock: Stock): Stock {
  const q = loadSnapshot()?.quotes[stock.symbol];
  if (!q) return stock;
  return {
    ...stock,
    name: q.name || stock.name,
    price: q.price,
    changePct: q.changePct,
  };
}

function snapshotBundle(): DataBundle {
  const snap = loadSnapshot();
  const stocks = mockStocks.map(overlayFromSnapshot);
  return {
    stocks,
    themes: mockThemes,
    supplyEdges: mockEdges,
    dataSource: snap ? 'snapshot' : 'mock',
    meta: snap
      ? { asOf: snap.asOf, source: snap.source, count: snap.count }
      : null,
  };
}

function mockBundle(): DataBundle {
  return {
    stocks: mockStocks,
    themes: mockThemes,
    supplyEdges: mockEdges,
    dataSource: 'mock',
    meta: null,
  };
}

/** 非同步資料包：頁面 / API 優先使用此函式 */
export async function getDataBundle(opts?: {
  symbol?: string;
  theme?: string;
}): Promise<DataBundle> {
  if (MODE === 'mock') return mockBundle();

  // supabase 優先（MODE=supabase 強制；MODE=auto 有設定就嘗試）
  if ((MODE === 'supabase' || MODE === 'auto') && canUseSupabase()) {
    try {
      const [stocks, themes, edges] = await Promise.all([
        fetchStocksFromSupabase({
          symbol: opts?.symbol,
          theme: opts?.theme,
        }),
        fetchThemesFromSupabase(),
        fetchEdgesFromSupabase(),
      ]);
      // 有資料才視為成功（空表退回 snapshot）
      if (stocks.length > 0) {
        return {
          stocks,
          themes: themes.length ? themes : mockThemes,
          supplyEdges: edges.length ? edges : mockEdges,
          dataSource: 'supabase',
          meta: {
            source: 'supabase',
            count: stocks.length,
            asOf: new Date().toISOString().slice(0, 10),
          },
        };
      }
      if (MODE === 'supabase') {
        // 強制 supabase 但空表 → 仍回空 + mock themes
        return {
          stocks,
          themes: themes.length ? themes : mockThemes,
          supplyEdges: edges.length ? edges : mockEdges,
          dataSource: 'supabase',
          meta: { source: 'supabase', count: 0 },
        };
      }
    } catch (e) {
      console.error('[source] supabase failed, fallback snapshot', e);
    }
  }

  if (MODE === 'supabase') {
    // 未設定 env 卻要求 supabase
    return mockBundle();
  }

  // snapshot / auto fallback
  const bundle = snapshotBundle();
  if (opts?.symbol) {
    return {
      ...bundle,
      stocks: bundle.stocks.filter((s) => s.symbol === opts.symbol),
    };
  }
  if (opts?.theme) {
    return {
      ...bundle,
      stocks: bundle.stocks.filter((s) => s.themeSlug === opts.theme),
    };
  }
  return bundle;
}

// ---- 同步 API（僅 snapshot/mock；供 build 期 graph 預設用）----
const syncBundle = MODE === 'mock' ? mockBundle() : snapshotBundle();

export const themes: Theme[] = syncBundle.themes;
export const stocks: Stock[] = syncBundle.stocks;
export const supplyEdges: SupplyEdge[] = syncBundle.supplyEdges;

export function getStock(symbol: string): Stock | undefined {
  return stocks.find((s) => s.symbol === symbol);
}

export function getTheme(slug: string): Theme | undefined {
  return themes.find((t) => t.slug === slug);
}

export function getStocksByTheme(slug: string): Stock[] {
  return stocks.filter((s) => s.themeSlug === slug);
}

export function getSnapshotMeta(): { asOf: string; source: string; count: number } | null {
  const s = loadSnapshot();
  return s ? { asOf: s.asOf, source: s.source, count: s.count } : null;
}
