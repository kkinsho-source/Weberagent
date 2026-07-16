/**
 * 日頻估值序列（PER / PBR / 殖利率）— FinMind
 */
import 'server-only';

export type ValuationDay = {
  date: string;
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
};

export async function fetchValuationSeries(
  symbol: string,
  startDate?: string
): Promise<ValuationDay[]> {
  const start =
    startDate ||
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().slice(0, 10);
    })();
  try {
    const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPER&data_id=${encodeURIComponent(symbol)}&start_date=${start}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.95' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      data?: Array<{
        date: string;
        PER?: number;
        PBR?: number;
        dividend_yield?: number;
      }>;
    };
    return (j.data || [])
      .map((r) => ({
        date: r.date,
        pe: r.PER ?? null,
        pb: r.PBR ?? null,
        dividendYield: r.dividend_yield ?? null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
