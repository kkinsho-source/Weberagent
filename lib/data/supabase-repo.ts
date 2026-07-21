/**
 * Supabase 讀取層（server-only）
 */
import 'server-only';
import type { Stock, Theme, SupplyEdge } from '../types';
import { getSupabaseServerClient, isSupabaseConfigured } from '../supabase/server';
import type { DbEtlLog, DbStock, DbTheme, DbSupplyEdge } from '../supabase/types';
import { normalizeTheme } from './theme-scope';

export function canUseSupabase(): boolean {
  return isSupabaseConfigured();
}

function mapStock(row: DbStock): Stock {
  return {
    symbol: row.symbol,
    name: row.name,
    market: row.market,
    industry: row.industry ?? '',
    themeSlug: row.theme_slug ?? '',
    price: Number(row.price ?? 0),
    changePct: Number(row.change_pct ?? 0),
    marketCap: Number(row.market_cap ?? 0),
    asOf: row.as_of ?? undefined,
  };
}

export async function fetchStocksFromSupabase(opts?: {
  symbol?: string;
  theme?: string;
  market?: string;
}): Promise<Stock[]> {
  const sb = getSupabaseServerClient();
  if (!sb) return [];

  let q = sb.from('stocks').select('*').order('symbol');
  if (opts?.symbol) q = q.eq('symbol', opts.symbol);
  if (opts?.theme) q = q.eq('theme_slug', opts.theme);
  if (opts?.market) q = q.eq('market', opts.market);

  const { data, error } = await q;
  if (error) {
    console.error('[supabase] fetch stocks failed:', error.message);
    return [];
  }
  return ((data as DbStock[] | null) ?? []).map(mapStock);
}

export async function fetchThemesFromSupabase(): Promise<Theme[]> {
  const sb = getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb.from('themes').select('*').order('slug');
  if (error) {
    console.error('[supabase] fetch themes failed:', error.message);
    return [];
  }
  return ((data as DbTheme[] | null) ?? []).map((t) =>
    normalizeTheme({
      slug: t.slug,
      title: t.title,
      description: t.description ?? '',
      market: t.market,
      companyCount: t.company_count ?? 0,
      verifiedAt: t.verified_at ?? '',
      // S1：DB 尚未加欄時走 normalize 預設 tier=1 / ai_chain
      tier: t.tier ?? undefined,
      family: t.family ?? undefined,
      radarDefault: t.radar_default ?? undefined,
    }),
  );
}

export async function fetchEdgesFromSupabase(): Promise<SupplyEdge[]> {
  const sb = getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb.from('supply_edges').select('*');
  if (error) {
    console.error('[supabase] fetch edges failed:', error.message);
    return [];
  }
  return ((data as DbSupplyEdge[] | null) ?? []).map((e) => ({
    from: e.from_symbol,
    to: e.to_symbol,
    relation: e.relation,
  }));
}

export async function fetchRecentEtlLogs(limit = 10): Promise<DbEtlLog[]> {
  const sb = getSupabaseServerClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from('etl_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[supabase] fetch etl_logs failed:', error.message);
    return [];
  }
  return (data as DbEtlLog[] | null) ?? [];
}
