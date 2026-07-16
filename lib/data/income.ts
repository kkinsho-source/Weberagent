/**
 * 財報擴充：損益重點（FinMind）
 */
import 'server-only';

export type IncomeQuarter = {
  date: string;
  year: number;
  season: number;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  pretaxIncome: number | null;
  netIncome: number | null;
  eps: number | null;
};

function seasonFromMonth(m: number): number {
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

export async function fetchIncomeQuarters(
  symbol: string,
  limit = 8
): Promise<IncomeQuarter[]> {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  const startDate = start.toISOString().slice(0, 10);
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockFinancialStatements&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.7' },
      next: { revalidate: 21600 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{ date: string; type: string; value: number }>;
    };
    const byDate = new Map<string, IncomeQuarter>();
    for (const row of json.data || []) {
      const [y, m] = row.date.split('-').map(Number);
      if (!byDate.has(row.date)) {
        byDate.set(row.date, {
          date: row.date,
          year: y,
          season: seasonFromMonth(m || 3),
          revenue: null,
          grossProfit: null,
          operatingIncome: null,
          pretaxIncome: null,
          netIncome: null,
          eps: null,
        });
      }
      const q = byDate.get(row.date)!;
      const v = Number(row.value);
      if (!Number.isFinite(v)) continue;
      switch (row.type) {
        case 'Revenue':
          q.revenue = v;
          break;
        case 'GrossProfit':
          q.grossProfit = v;
          break;
        case 'OperatingIncome':
          q.operatingIncome = v;
          break;
        case 'PreTaxIncome':
          q.pretaxIncome = v;
          break;
        case 'IncomeAfterTaxes':
          q.netIncome = v;
          break;
        case 'EPS':
          q.eps = v;
          break;
      }
    }
    return Array.from(byDate.values())
      .filter((q) => q.revenue != null || q.eps != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  } catch {
    return [];
  }
}
