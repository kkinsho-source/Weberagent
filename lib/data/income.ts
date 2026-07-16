/**
 * 季報：損益 / 資產負債 / 現金流（FinMind）
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

export type BalanceQuarter = {
  date: string;
  year: number;
  season: number;
  cash: number | null;
  currentAssets: number | null;
  totalAssets: number | null;
  currentLiabilities: number | null;
  totalLiabilities: number | null;
  equity: number | null;
};

export type CashflowQuarter = {
  date: string;
  year: number;
  season: number;
  operating: number | null;
  investing: number | null;
  financing: number | null;
  endCash: number | null;
};

function seasonFromMonth(m: number): number {
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

async function fetchFinMind(
  dataset: string,
  symbol: string,
  startDate: string
): Promise<Array<{ date: string; type: string; value: number }>> {
  const url = `https://api.finmindtrade.com/api/v4/data?dataset=${dataset}&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.8' },
    next: { revalidate: 21600 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: Array<{ date: string; type: string; value: number }> };
  return json.data || [];
}

function startDateYears(y: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - y);
  return d.toISOString().slice(0, 10);
}

export async function fetchIncomeQuarters(symbol: string, limit = 8): Promise<IncomeQuarter[]> {
  try {
    const rows = await fetchFinMind('TaiwanStockFinancialStatements', symbol, startDateYears(3));
    const byDate = new Map<string, IncomeQuarter>();
    for (const row of rows) {
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
      if (row.type === 'Revenue') q.revenue = v;
      else if (row.type === 'GrossProfit') q.grossProfit = v;
      else if (row.type === 'OperatingIncome') q.operatingIncome = v;
      else if (row.type === 'PreTaxIncome') q.pretaxIncome = v;
      else if (row.type === 'IncomeAfterTaxes') q.netIncome = v;
      else if (row.type === 'EPS') q.eps = v;
    }
    return Array.from(byDate.values())
      .filter((q) => q.revenue != null || q.eps != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  } catch {
    return [];
  }
}

export async function fetchBalanceQuarters(symbol: string, limit = 8): Promise<BalanceQuarter[]> {
  try {
    const rows = await fetchFinMind('TaiwanStockBalanceSheet', symbol, startDateYears(3));
    const byDate = new Map<string, BalanceQuarter>();
    for (const row of rows) {
      if (row.type.endsWith('_per')) continue;
      const [y, m] = row.date.split('-').map(Number);
      if (!byDate.has(row.date)) {
        byDate.set(row.date, {
          date: row.date,
          year: y,
          season: seasonFromMonth(m || 3),
          cash: null,
          currentAssets: null,
          totalAssets: null,
          currentLiabilities: null,
          totalLiabilities: null,
          equity: null,
        });
      }
      const q = byDate.get(row.date)!;
      const v = Number(row.value);
      if (!Number.isFinite(v)) continue;
      if (row.type === 'CashAndCashEquivalents') q.cash = v;
      else if (row.type === 'CurrentAssets') q.currentAssets = v;
      else if (row.type === 'TotalAssets') q.totalAssets = v;
      else if (row.type === 'CurrentLiabilities') q.currentLiabilities = v;
      else if (row.type === 'Liabilities' || row.type === 'TotalLiabilities')
        q.totalLiabilities = v;
      else if (row.type === 'Equity') q.equity = v;
      else if (row.type === 'EquityAttributableToOwnersOfParent' && q.equity == null)
        q.equity = v;
    }
    // fill TotalAssets if missing: try NoncurrentAssets+CurrentAssets from types
    return Array.from(byDate.values())
      .filter((q) => q.cash != null || q.equity != null || q.totalAssets != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  } catch {
    return [];
  }
}

export async function fetchCashflowQuarters(symbol: string, limit = 8): Promise<CashflowQuarter[]> {
  try {
    const rows = await fetchFinMind('TaiwanStockCashFlowsStatement', symbol, startDateYears(3));
    const byDate = new Map<string, CashflowQuarter>();
    for (const row of rows) {
      const [y, m] = row.date.split('-').map(Number);
      if (!byDate.has(row.date)) {
        byDate.set(row.date, {
          date: row.date,
          year: y,
          season: seasonFromMonth(m || 3),
          operating: null,
          investing: null,
          financing: null,
          endCash: null,
        });
      }
      const q = byDate.get(row.date)!;
      const v = Number(row.value);
      if (!Number.isFinite(v)) continue;
      if (
        row.type === 'CashFlowsFromOperatingActivities' ||
        row.type === 'NetCashInflowFromOperatingActivities'
      ) {
        q.operating = v;
      } else if (row.type === 'CashProvidedByInvestingActivities') {
        q.investing = v;
      } else if (row.type === 'CashFlowsProvidedFromFinancingActivities') {
        q.financing = v;
      } else if (row.type === 'CashBalancesEndOfPeriod') {
        q.endCash = v;
      }
    }
    return Array.from(byDate.values())
      .filter((q) => q.operating != null || q.investing != null || q.financing != null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit);
  } catch {
    return [];
  }
}
