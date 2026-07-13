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
  dataSource: 'supabase' | 'snapshot';
  totalHint?: number;
}> {
  const limit = query.limit ?? 50;

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
          // PostgREST or filter
          q = q.or(`title.ilike.%${query.q}%,content.ilike.%${query.q}%,company_name.ilike.%${query.q}%`);
        }

        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          return {
            dataSource: 'supabase',
            items: data.map((r) => ({
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
            })),
          };
        }
      }
    } catch (e) {
      console.error('[mops] supabase fetch failed', e);
    }
  }

  const local = filterLocal(loadSnapshotItems().map(mapSnapshot), query);
  return {
    dataSource: 'snapshot',
    items: local,
    totalHint: loadSnapshotItems().length,
  };
}
