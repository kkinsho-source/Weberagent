/**
 * MOPS 重大訊息讀取層
 * 優先 Supabase mops_announcements，否則 fallback lib/data/mops_snapshot.json
 */
import 'server-only';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

export type MopsAnnouncement = {
  id?: string;
  symbol: string;
  companyName: string;
  speakDate: string;
  speakTime: string;
  title: string;
  content: string;
  clause: string;
  eventDate: string | null;
  source: string;
  fingerprint?: string;
};

export type MopsQuery = {
  symbol?: string;
  from?: string; // ISO date
  to?: string;
  limit?: number;
  q?: string; // keyword in title/content
};

type SnapshotItem = {
  symbol: string;
  company_name?: string;
  speak_date: string;
  speak_time?: string;
  title: string;
  content?: string;
  clause?: string;
  event_date?: string | null;
  source: string;
  fingerprint?: string;
};

function loadSnapshotItems(): SnapshotItem[] {
  try {
    const p = path.join(process.cwd(), 'lib', 'data', 'mops_snapshot.json');
    if (!fs.existsSync(p)) return [];
    const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as { items?: SnapshotItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

function mapSnapshot(item: SnapshotItem): MopsAnnouncement {
  return {
    symbol: item.symbol,
    companyName: item.company_name ?? '',
    speakDate: item.speak_date,
    speakTime: item.speak_time ?? '',
    title: item.title,
    content: item.content ?? '',
    clause: item.clause ?? '',
    eventDate: item.event_date ?? null,
    source: item.source,
    fingerprint: item.fingerprint,
  };
}

function filterLocal(items: MopsAnnouncement[], q: MopsQuery): MopsAnnouncement[] {
  let out = items;
  if (q.symbol) out = out.filter((x) => x.symbol === q.symbol);
  if (q.from) out = out.filter((x) => x.speakDate >= q.from!);
  if (q.to) out = out.filter((x) => x.speakDate <= q.to!);
  if (q.q) {
    const kw = q.q.toLowerCase();
    out = out.filter(
      (x) =>
        x.title.toLowerCase().includes(kw) ||
        x.content.toLowerCase().includes(kw) ||
        x.companyName.toLowerCase().includes(kw)
    );
  }
  out = [...out].sort((a, b) => {
    const d = b.speakDate.localeCompare(a.speakDate);
    if (d !== 0) return d;
    return (b.speakTime || '').localeCompare(a.speakTime || '');
  });
  const limit = q.limit ?? 50;
  return out.slice(0, limit);
}

export async function fetchMopsAnnouncements(query: MopsQuery = {}): Promise<{
  items: MopsAnnouncement[];
  dataSource: 'supabase' | 'snapshot' | 'openapi+supabase' | 'openapi';
  totalHint?: number;
}> {
  const limit = query.limit ?? 50;
  let items: MopsAnnouncement[] = [];
  let dataSource: 'supabase' | 'snapshot' | 'openapi+supabase' | 'openapi' = 'snapshot';

  if (isSupabaseConfigured()) {
    try {
      const sb = getSupabaseServerClient();
      if (sb) {
        let q = sb
          .from('mops_announcements')
          .select(
            'id,symbol,company_name,speak_date,speak_time,title,content,clause,event_date,source,fingerprint'
          )
          .order('speak_date', { ascending: false })
          .order('speak_time', { ascending: false })
          .limit(limit);

        if (query.symbol) q = q.eq('symbol', query.symbol);
        if (query.from) q = q.gte('speak_date', query.from);
        if (query.to) q = q.lte('speak_date', query.to);
        if (query.q) {
          q = q.or(
            `title.ilike.%${query.q}%,content.ilike.%${query.q}%,company_name.ilike.%${query.q}%`
          );
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          items = data.map((r) => ({
            id: r.id as string,
            symbol: r.symbol as string,
            companyName: (r.company_name as string) ?? '',
            speakDate: r.speak_date as string,
            speakTime: (r.speak_time as string) ?? '',
            title: r.title as string,
            content: (r.content as string) ?? '',
            clause: (r.clause as string) ?? '',
            eventDate: (r.event_date as string) ?? null,
            source: r.source as string,
            fingerprint: r.fingerprint as string,
          }));
          dataSource = 'supabase';
        }
      }
    } catch (e) {
      console.error('[mops] supabase fetch failed', e);
    }
  }

  // N3：若 DB 偏少，補證交所 OpenAPI 當日重大訊息
  if (items.length < 5) {
    try {
      const openItems = await fetchTwseOpenApiMops(query.symbol, limit);
      if (openItems.length) {
        const seen = new Set(items.map((x) => `${x.symbol}|${x.speakDate}|${x.title}`));
        for (const it of openItems) {
          const k = `${it.symbol}|${it.speakDate}|${it.title}`;
          if (seen.has(k)) continue;
          seen.add(k);
          items.push(it);
        }
        items.sort((a, b) => {
          const d = b.speakDate.localeCompare(a.speakDate);
          if (d !== 0) return d;
          return (b.speakTime || '').localeCompare(a.speakTime || '');
        });
        items = items.slice(0, limit);
        dataSource = dataSource === 'supabase' ? 'openapi+supabase' : 'openapi';
      }
    } catch (e) {
      console.error('[mops] openapi fallback', e);
    }
  }

  if (items.length) {
    return { dataSource, items };
  }

  const local = filterLocal(loadSnapshotItems().map(mapSnapshot), query);
  return {
    dataSource: 'snapshot',
    items: local,
    totalHint: loadSnapshotItems().length,
  };
}

/** 證交所 OpenAPI 每日重大訊息 t187ap04_L */
async function fetchTwseOpenApiMops(
  symbol: string | undefined,
  limit: number
): Promise<MopsAnnouncement[]> {
  const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap04_L', {
    headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.8' },
    next: { revalidate: 1800 },
  });
  if (!res.ok) return [];
  const rows = (await res.json()) as Array<Record<string, string>>;
  const out: MopsAnnouncement[] = [];
  for (const r of rows) {
    const sym = (r['公司代號'] || '').trim();
    if (symbol && sym !== symbol) continue;
    const speak = (r['發言日期'] || r['發言日期時間'] || '').trim();
    // 可能格式 115/07/16 或 1150716
    let speakDate = speak.slice(0, 10).replace(/\//g, '-');
    if (/^\d{6,7}/.test(speak.replace(/\D/g, ''))) {
      const d = speak.replace(/\D/g, '');
      if (d.length >= 7) {
        const y = Number(d.slice(0, 3)) + 1911;
        speakDate = `${y}-${d.slice(3, 5)}-${d.slice(5, 7)}`;
      }
    }
    out.push({
      symbol: sym,
      companyName: (r['公司名稱'] || '').trim(),
      speakDate,
      speakTime: (r['發言時間'] || '').trim(),
      title: (r['主旨'] || r['主　旨'] || '').trim(),
      content: (r['說明'] || r['詳細資料'] || '').trim(),
      clause: (r['符合條款'] || '').trim(),
      eventDate: (r['事實發生日'] || '').trim() || null,
      source: 'TWSE OpenAPI t187ap04_L',
    });
    if (out.length >= limit) break;
  }
  return out;
}
