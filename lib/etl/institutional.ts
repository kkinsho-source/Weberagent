/**
 * TWSE T86 + 櫃買三大法人（單日）— server ETL
 */
import 'server-only';

export type InstDayQuote = {
  symbol: string;
  netShares: number;
  name?: string;
  market: 'twse' | 'tpex';
};

function parseIntLoose(s: unknown): number {
  if (typeof s === 'number' && Number.isFinite(s)) return Math.trunc(s);
  const t = String(s ?? '')
    .trim()
    .replace(/,/g, '')
    .replace(/\+/g, '');
  if (!t || t === '-' || t === 'X') return 0;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rocSlash(d: Date): string {
  return `${d.getFullYear() - 1911}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export async function fetchTwseT86(d: Date): Promise<{ asOf: string; rows: InstDayQuote[] }> {
  const ymd = toYmd(d);
  const url = `https://www.twse.com.tw/rwd/zh/fund/T86?response=json&date=${ymd}&selectType=ALLBUT0999`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'weberagent-cron/1.0',
      Referer: 'https://www.twse.com.tw/',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`T86 HTTP ${res.status}`);
  const js = (await res.json()) as {
    stat?: string;
    fields?: string[];
    data?: string[][];
    date?: string;
  };
  if (js.stat !== 'OK' || !js.data?.length) {
    return { asOf: toIso(d), rows: [] };
  }
  const fields = js.fields || [];
  const idxCode = fields.indexOf('證券代號');
  const idxName = fields.indexOf('證券名稱');
  const idxNet = fields.indexOf('三大法人買賣超股數');
  const iCode = idxCode >= 0 ? idxCode : 0;
  const iName = idxName >= 0 ? idxName : 1;
  const iNet = idxNet >= 0 ? idxNet : fields.length - 1;
  const rows: InstDayQuote[] = [];
  for (const row of js.data) {
    if (!row?.length) continue;
    const symbol = String(row[iCode] || '').trim();
    if (!symbol) continue;
    rows.push({
      symbol,
      name: String(row[iName] || '').trim(),
      netShares: parseIntLoose(row[iNet]),
      market: 'twse',
    });
  }
  const asOf =
    js.date && js.date.length === 8
      ? `${js.date.slice(0, 4)}-${js.date.slice(4, 6)}-${js.date.slice(6, 8)}`
      : toIso(d);
  return { asOf, rows };
}

export async function fetchTpex3Insti(d: Date): Promise<{ asOf: string; rows: InstDayQuote[] }> {
  const url =
    'https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php' +
    `?l=zh-tw&se=EW&t=D&d=${encodeURIComponent(rocSlash(d))}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'weberagent-cron/1.0',
      Referer: 'https://www.tpex.org.tw/',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`TPEx 3insti HTTP ${res.status}`);
  const js = (await res.json()) as {
    tables?: Array<{ data?: string[][]; date?: string }>;
  };
  const table = js.tables?.[0];
  const data = table?.data || [];
  const rows: InstDayQuote[] = [];
  for (const row of data) {
    if (!row || row.length < 3) continue;
    const symbol = String(row[0] || '').trim();
    if (!symbol) continue;
    rows.push({
      symbol,
      name: String(row[1] || '').trim(),
      netShares: parseIntLoose(row[row.length - 1]),
      market: 'tpex',
    });
  }
  return { asOf: toIso(d), rows };
}

/** 合併上市+上櫃，core 過濾；同代號以上市為準 */
export async function fetchInstitutionalDay(
  d: Date,
  coreSymbols: Set<string>,
): Promise<{ asOf: string; rows: InstDayQuote[]; twse: number; tpex: number }> {
  const [tw, tx] = await Promise.allSettled([fetchTwseT86(d), fetchTpex3Insti(d)]);
  const twRows = tw.status === 'fulfilled' ? tw.value.rows : [];
  const txRows = tx.status === 'fulfilled' ? tx.value.rows : [];
  const asOf =
    (tw.status === 'fulfilled' && tw.value.rows.length ? tw.value.asOf : null) ||
    (tx.status === 'fulfilled' && tx.value.rows.length ? tx.value.asOf : null) ||
    toIso(d);

  const map = new Map<string, InstDayQuote>();
  for (const r of txRows) {
    if (coreSymbols.has(r.symbol)) map.set(r.symbol, r);
  }
  for (const r of twRows) {
    if (coreSymbols.has(r.symbol)) map.set(r.symbol, r);
  }
  return {
    asOf,
    rows: Array.from(map.values()),
    twse: twRows.length,
    tpex: txRows.length,
  };
}

/** 往回找最近有資料的交易日（最多 tryDays 個日曆日） */
export async function fetchLatestInstitutionalDay(
  coreSymbols: Set<string>,
  tryDays = 6,
): Promise<{ asOf: string; rows: InstDayQuote[]; twse: number; tpex: number } | null> {
  const d = new Date();
  for (let i = 0; i < tryDays; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    // skip pure guess weekend still try — API returns empty
    try {
      const got = await fetchInstitutionalDay(day, coreSymbols);
      if (got.rows.length > 0) return got;
    } catch {
      /* next */
    }
  }
  return null;
}
