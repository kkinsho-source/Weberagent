/**
 * 三大法人買賣超（FinMind，免費可用）
 */
import 'server-only';

export type InstDay = {
  date: string;
  foreign: number; // 淨買超股數
  trust: number;
  dealer: number;
};

export async function fetchInstitutional(
  symbol: string,
  startDate?: string
): Promise<InstDay[]> {
  const start =
    startDate ||
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().slice(0, 10);
    })();
  try {
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${encodeURIComponent(symbol)}&start_date=${start}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.9' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{ date: string; name: string; buy: number; sell: number }>;
    };
    const byDate = new Map<string, InstDay>();
    for (const r of json.data || []) {
      if (!byDate.has(r.date)) {
        byDate.set(r.date, { date: r.date, foreign: 0, trust: 0, dealer: 0 });
      }
      const row = byDate.get(r.date)!;
      const net = Number(r.buy || 0) - Number(r.sell || 0);
      const n = (r.name || '').toLowerCase();
      if (n.includes('foreign')) row.foreign += net;
      else if (n.includes('investment_trust') || n.includes('trust')) row.trust += net;
      else if (n.includes('dealer')) row.dealer += net;
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
