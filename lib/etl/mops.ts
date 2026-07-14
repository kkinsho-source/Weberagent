/**
 * MOPS / 證交所重大訊息日更（serverless）
 */
import 'server-only';
import { createHash } from 'node:crypto';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase';

const OPENAPI = 'https://openapi.twse.com.tw/v1/opendata/t187ap04_L';

function rocToIso(s: string): string | null {
  const d = (s || '').trim();
  if (d.length === 7) {
    const y = Number(d.slice(0, 3)) + 1911;
    return `${y}-${d.slice(3, 5)}-${d.slice(5, 7)}`;
  }
  return null;
}

function normTime(s: string): string {
  const digits = (s || '').replace(/\D/g, '').padStart(6, '0').slice(0, 6);
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}:${digits.slice(4, 6)}`;
}

function fingerprint(symbol: string, date: string, time: string, title: string) {
  return createHash('sha1')
    .update(`${symbol}|${date}|${time}|${title}`)
    .digest('hex');
}

export type MopsRow = {
  symbol: string;
  company_name: string;
  speak_date: string;
  speak_time: string;
  title: string;
  content: string;
  clause: string;
  event_date: string | null;
  market: string;
  source: string;
  fingerprint: string;
  raw: Record<string, unknown>;
};

export async function fetchMopsDailyOpenapi(): Promise<MopsRow[]> {
  const res = await fetch(OPENAPI, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; aistockmap-etl/0.3)',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`MOPS OpenAPI HTTP ${res.status}`);
  const data = (await res.json()) as Array<Record<string, string>>;
  const rows: MopsRow[] = [];
  for (const item of data) {
    const symbol = (item['公司代號'] || '').trim();
    const title = (item['主旨 '] || item['主旨'] || '').replace(/\s+/g, ' ').trim();
    const speak_date = rocToIso(item['發言日期'] || '');
    if (!symbol || !title || !speak_date) continue;
    const speak_time = normTime(item['發言時間'] || '');
    rows.push({
      symbol,
      company_name: (item['公司名稱'] || '').trim(),
      speak_date,
      speak_time,
      title,
      content: (item['說明'] || '').replace(/\r\n/g, '\n').trim(),
      clause: (item['符合條款'] || '').trim(),
      event_date: rocToIso(item['事實發生日'] || ''),
      market: 'tw',
      source: 'openapi_t187ap04_L',
      fingerprint: fingerprint(symbol, speak_date, speak_time, title),
      raw: item,
    });
  }
  return rows;
}

export async function upsertMopsRows(rows: MopsRow[]): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, count: 0, error: 'missing_service_role' };
  }
  if (!rows.length) return { ok: true, count: 0 };
  const sb = getSupabaseAdminClient();
  if (!sb) return { ok: false, count: 0, error: 'no admin client' };

  const payload = rows.map((r) => ({
    symbol: r.symbol,
    company_name: r.company_name,
    speak_date: r.speak_date,
    speak_time: r.speak_time,
    title: r.title,
    content: r.content || null,
    clause: r.clause || null,
    event_date: r.event_date,
    market: r.market,
    source: r.source,
    fingerprint: r.fingerprint,
    raw: r.raw,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await sb.from('mops_announcements').upsert(payload, {
    onConflict: 'fingerprint',
  });
  if (error) return { ok: false, count: 0, error: error.message };
  return { ok: true, count: payload.length };
}
