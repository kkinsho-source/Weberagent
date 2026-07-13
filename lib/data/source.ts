import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Stock, Theme, SupplyEdge } from '../types';
import {
  themes as mockThemes,
  stocks as mockStocks,
  supplyEdges as mockEdges,
} from './mock';

/**
 * 單一資料縫合層（Phase 2 核心）
 * --------------------------------------------------------------
 * 前端 / 頁面統一從這裡取數，不要再直接 import mock。
 * 透過環境變數 DATA_MODE 切換資料來源：
 *   - 'mock'      : 全用靜態示意資料（開發/演示）
 *   - 'snapshot'  : 用 ETL 寫入的 lib/data/twse_snapshot.json 覆蓋報價（預設，已含真實行情）
 *   - 'supabase'  : 未來從 Supabase 讀（schema.sql 已備好，client 接好後啟用）
 * 預設行為：未設 DATA_MODE 時，有 snapshot 檔就走 snapshot，否則退回 mock。
 *
 * 只負責「縫合」：domain 分類（題材/產業/供應鏈）仍由 mock 提供，
 * 真實報價來自 snapshot。這讓產品從「示意」平滑過渡到「活資料」。
 */

const MODE = process.env.DATA_MODE;

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

let snapshotCache: Snapshot | null | undefined;

function loadSnapshot(): Snapshot | null {
  if (snapshotCache !== undefined) return snapshotCache;
  try {
    const p = path.join(process.cwd(), 'lib', 'data', 'twse_snapshot.json');
    snapshotCache = fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf-8')) as Snapshot) : null;
  } catch {
    snapshotCache = null;
  }
  return snapshotCache;
}

// 是否啟用 snapshot 覆蓋（false = 退回 mock 或走 supabase）
const SNAPSHOT_ENABLED: boolean =
  MODE === 'mock' ? false : MODE === 'supabase' ? false : loadSnapshot() !== null;

function overlay(stock: Stock): Stock {
  if (!SNAPSHOT_ENABLED) return stock;
  const q = loadSnapshot()?.quotes[stock.symbol];
  if (!q) return stock;
  return { ...stock, name: q.name || stock.name, price: q.price, changePct: q.changePct };
}

// ---- 對外 API（與原 mock 同名對稱，頁面只需改 import 路徑）----
export const themes: Theme[] = mockThemes;
export const stocks: Stock[] = mockStocks.map(overlay);
export const supplyEdges: SupplyEdge[] = mockEdges;

export function getStock(symbol: string): Stock | undefined {
  const s = mockStocks.find((x) => x.symbol === symbol);
  return s ? overlay(s) : undefined;
}

export function getTheme(slug: string): Theme | undefined {
  return mockThemes.find((t) => t.slug === slug);
}

export function getStocksByTheme(slug: string): Stock[] {
  return mockStocks.filter((s) => s.themeSlug === slug).map(overlay);
}

export function getSnapshotMeta(): { asOf: string; source: string; count: number } | null {
  const s = loadSnapshot();
  return s ? { asOf: s.asOf, source: s.source, count: s.count } : null;
}
