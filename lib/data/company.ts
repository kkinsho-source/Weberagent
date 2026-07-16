/**
 * 公司基本資料（TWSE OpenAPI t187ap03）+ 估值
 */
import 'server-only';

export type CompanyProfile = {
  symbol: string;
  fullName: string;
  shortName: string;
  industryCode: string;
  industryName: string;
  address: string;
  chairman: string;
  generalManager: string;
  spokesman: string;
  spokesmanTitle: string;
  phone: string;
  established: string;
  listedDate: string;
  parValue: string;
  paidInCapital: string;
  taxId: string;
  privateShares: string;
  preferredShares: string;
  dataSource: string;
};

export type ValuationSnapshot = {
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  high52: number | null;
  low52: number | null;
  avgVolume20: number | null;
  dataSource: string;
};

/** 證交所產業別代碼（常見） */
const INDUSTRY_MAP: Record<string, string> = {
  '01': '水泥工業',
  '02': '食品工業',
  '03': '塑膠工業',
  '04': '紡織纖維',
  '05': '電機機械',
  '06': '電器電纜',
  '08': '玻璃陶瓷',
  '09': '造紙工業',
  '10': '鋼鐵工業',
  '11': '橡膠工業',
  '12': '汽車工業',
  '14': '建材營造',
  '15': '航運業',
  '16': '觀光事業',
  '17': '金融保險',
  '18': '貿易百貨',
  '20': '其他',
  '21': '化學工業',
  '22': '生技醫療',
  '23': '油電燃氣',
  '24': '半導體',
  '25': '電腦及週邊',
  '26': '光電業',
  '27': '通信網路',
  '28': '電子零組件',
  '29': '電子通路',
  '30': '資訊服務',
  '31': '其他電子',
  '32': '文化創意',
  '33': '農業科技',
  '34': '電子商務',
  '35': '綠能環保',
  '36': '數位雲端',
  '37': '運動休閒',
  '38': '居家生活',
};

export function industryNameOf(code: string): string {
  return INDUSTRY_MAP[code] || (code ? `產業代碼 ${code}` : '—');
}

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  try {
    const res = await fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L', {
      headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.8' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<Record<string, string>>;
    const r = rows.find((x) => (x['公司代號'] || '').trim() === symbol);
    if (!r) return null;
    const code = (r['產業別'] || '').trim();
    return {
      symbol,
      fullName: (r['公司名稱'] || '').trim(),
      shortName: (r['公司簡稱'] || '').trim(),
      industryCode: code,
      industryName: industryNameOf(code),
      address: (r['住址'] || '').trim(),
      chairman: (r['董事長'] || '').trim(),
      generalManager: (r['總經理'] || '').trim(),
      spokesman: (r['發言人'] || '').trim(),
      spokesmanTitle: (r['發言人職稱'] || '').trim(),
      phone: (r['總機電話'] || '').trim(),
      established: (r['成立日期'] || '').trim(),
      listedDate: (r['上市日期'] || '').trim(),
      parValue: (r['普通股每股面額'] || '').trim(),
      paidInCapital: (r['實收資本額'] || '').trim(),
      taxId: (r['營利事業統一編號'] || '').trim(),
      privateShares: (r['私募股數'] || '').trim(),
      preferredShares: (r['特別股'] || '').trim(),
      dataSource: 'TWSE t187ap03_L',
    };
  } catch {
    return null;
  }
}

export async function fetchValuation(symbol: string): Promise<ValuationSnapshot> {
  const empty: ValuationSnapshot = {
    pe: null,
    pb: null,
    dividendYield: null,
    high52: null,
    low52: null,
    avgVolume20: null,
    dataSource: 'none',
  };
  try {
    const start = new Date();
    start.setFullYear(start.getFullYear() - 1);
    const startDate = start.toISOString().slice(0, 10);
    const [perRes, priceRes] = await Promise.all([
      fetch(
        `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPER&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`,
        {
          headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.8' },
          next: { revalidate: 3600 },
        }
      ),
      fetch(
        `https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=${encodeURIComponent(symbol)}&start_date=${startDate}`,
        {
          headers: { Accept: 'application/json', 'User-Agent': 'weberagent/0.8' },
          next: { revalidate: 3600 },
        }
      ),
    ]);
    let pe: number | null = null;
    let pb: number | null = null;
    let dividendYield: number | null = null;
    let dataSource = 'FinMind';

    if (perRes.ok) {
      const j = (await perRes.json()) as {
        data?: Array<{ PER?: number; PBR?: number; dividend_yield?: number }>;
      };
      const last = (j.data || []).at(-1);
      if (last) {
        pe = last.PER ?? null;
        pb = last.PBR ?? null;
        dividendYield = last.dividend_yield ?? null;
      }
    }

    let high52: number | null = null;
    let low52: number | null = null;
    let avgVolume20: number | null = null;
    if (priceRes.ok) {
      const j = (await priceRes.json()) as {
        data?: Array<{ max?: number; min?: number; close?: number; Trading_Volume?: number }>;
      };
      const rows = j.data || [];
      if (rows.length) {
        high52 = Math.max(...rows.map((r) => Number(r.max || r.close || 0)));
        low52 = Math.min(...rows.map((r) => Number(r.min || r.close || Infinity)));
        const vols = rows.slice(-20).map((r) => Number(r.Trading_Volume || 0));
        if (vols.length) avgVolume20 = Math.round(vols.reduce((a, b) => a + b, 0) / vols.length);
      }
    }

    return { pe, pb, dividendYield, high52, low52, avgVolume20, dataSource };
  } catch {
    return empty;
  }
}
