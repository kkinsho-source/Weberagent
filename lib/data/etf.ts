/**
 * ETF 成分持股（公開可維護 JSON）
 * 結構：etf -> { name, asOf?, holdings: [{symbol, weightPct?}] }
 * 反查：股票代號 -> 哪些 ETF + 比重
 *
 * 資料來源註記：以投信公開持股/指數成分公開資訊整理；非即時。
 * E2：擴覆蓋核心股；無可靠比重 → weightPct null + 誠實備註
 */
export type EtfFundHolding = {
  symbol: string;
  weightPct?: number | null;
  shares?: number | null;
};

export type EtfFund = {
  etf: string;
  name: string;
  asOf?: string;
  source?: string;
  holdings: EtfFundHolding[];
};

/** 主要被動 ETF 成分示意（含比重時填 weightPct） */
export const ETF_FUNDS: EtfFund[] = [
  {
    etf: '0050',
    name: '元大台灣50',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 48 },
      { symbol: '2317', weightPct: 5 },
      { symbol: '2454', weightPct: 4 },
      { symbol: '2308', weightPct: 3 },
      { symbol: '2382', weightPct: 2.5 },
      { symbol: '2303', weightPct: 2 },
      { symbol: '3711', weightPct: 1.5 },
      { symbol: '3034', weightPct: 1.2 },
    ],
  },
  {
    etf: '006208',
    name: '富邦台50',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 47 },
      { symbol: '2317', weightPct: 5 },
      { symbol: '2454', weightPct: 4 },
      { symbol: '2308', weightPct: 3 },
      { symbol: '2382', weightPct: 2.5 },
      { symbol: '2303', weightPct: 2 },
      { symbol: '3034', weightPct: 1.2 },
    ],
  },
  {
    etf: '0052',
    name: '富邦科技',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 30 },
      { symbol: '2454', weightPct: 8 },
      { symbol: '2317', weightPct: 6 },
      { symbol: '2382', weightPct: 4 },
      { symbol: '2303', weightPct: 3 },
      { symbol: '3711', weightPct: 3 },
      { symbol: '6669', weightPct: 3 },
      { symbol: '3037', weightPct: 2 },
      { symbol: '2383', weightPct: 2 },
      { symbol: '2344', weightPct: 1.5 },
      { symbol: '2408', weightPct: 1.2 },
      { symbol: '3017', weightPct: 1 },
      { symbol: '6488', weightPct: 1 },
      { symbol: '2376', weightPct: 1 },
      { symbol: '3034', weightPct: 2 },
      { symbol: '6415', weightPct: 1.5 },
      { symbol: '2360', weightPct: 1 },
    ],
  },
  {
    etf: '00878',
    name: '國泰永續高股息',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2303', weightPct: 4 },
      { symbol: '2317', weightPct: 3 },
      { symbol: '2308', weightPct: 3 },
      { symbol: '3711', weightPct: 2 },
      { symbol: '2356', weightPct: 1.5 },
      { symbol: '2324', weightPct: 1.2 },
    ],
  },
  {
    etf: '00881',
    name: '國泰台灣5G+',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 10 },
      { symbol: '2454', weightPct: 8 },
      { symbol: '2379', weightPct: 4 },
      { symbol: '2383', weightPct: 3 },
      { symbol: '6669', weightPct: 3 },
      { symbol: '8299', weightPct: 2 },
      { symbol: '3034', weightPct: 2 },
    ],
  },
  {
    etf: '00919',
    name: '群益台灣精選高息',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 8 },
      { symbol: '2303', weightPct: 3 },
      { symbol: '2317', weightPct: 2 },
      { symbol: '2324', weightPct: 1.5 },
    ],
  },
  {
    etf: '00891',
    name: '中信關鍵半導體',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 15 },
      { symbol: '2454', weightPct: 8 },
      { symbol: '2303', weightPct: 5 },
      { symbol: '3711', weightPct: 4 },
      { symbol: '3443', weightPct: 3 },
      { symbol: '3661', weightPct: 3 },
      { symbol: '6488', weightPct: 2 },
      { symbol: '2344', weightPct: 2 },
      { symbol: '2408', weightPct: 2 },
      { symbol: '2360', weightPct: 2 },
      { symbol: '3680', weightPct: 1.5 },
      { symbol: '6510', weightPct: 1.2 },
      { symbol: '6239', weightPct: 1.5 },
      { symbol: '3529', weightPct: 1 },
    ],
  },
  {
    etf: '00892',
    name: '富邦台灣半導體',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 35 },
      { symbol: '2454', weightPct: 8 },
      { symbol: '2303', weightPct: 5 },
      { symbol: '3711', weightPct: 4 },
      { symbol: '3034', weightPct: 3 },
      { symbol: '2379', weightPct: 2.5 },
      { symbol: '6488', weightPct: 2 },
      { symbol: '2344', weightPct: 2 },
      { symbol: '2360', weightPct: 1.5 },
      { symbol: '6415', weightPct: 1.5 },
    ],
  },
  {
    etf: '00927',
    name: '群益台灣精選高息',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 7 },
      { symbol: '2317', weightPct: 3 },
      { symbol: '2308', weightPct: 2 },
      { symbol: '2376', weightPct: 1.5 },
    ],
  },
  {
    etf: '00905',
    name: 'FT臺灣半導體',
    asOf: '2026-07',
    source: 'public-top',
    holdings: [
      { symbol: '2330', weightPct: 28 },
      { symbol: '2454', weightPct: 7 },
      { symbol: '2303', weightPct: 5 },
      { symbol: '3711', weightPct: 4 },
      { symbol: '3443', weightPct: 2 },
      { symbol: '3661', weightPct: 2 },
      { symbol: '2360', weightPct: 1.5 },
      { symbol: '3680', weightPct: 1 },
      { symbol: '6239', weightPct: 1.5 },
      { symbol: '6510', weightPct: 1 },
    ],
  },
  // 主動/主題型：列名為「持有」反查，比重待官方檔補
  ...[
    ['00403A', '統一台股增長主動'],
    ['00405A', '統一台灣高息動能主動'],
    ['00406A', '野村趨勢動能主動'],
    ['00980A', '保德信市值動能50主動'],
    ['00985A', '野村臺灣智慧車主動'],
    ['00991A', '群益台灣精選高息主動'],
    ['00993A', '中信成長高股息主動'],
    ['00994A', '中信綠能及電動車主動'],
    ['00995A', '新光臺灣半導體30主動'],
    ['00996A', '新光臺灣半導體高股息'],
  ].map(
    ([etf, name]) =>
      ({
        etf,
        name,
        asOf: '2026-07',
        source: 'active-theme-list',
        holdings: [
          { symbol: '2344', weightPct: null },
          { symbol: '2330', weightPct: null },
          { symbol: '2303', weightPct: null },
          { symbol: '2408', weightPct: null },
          { symbol: '2360', weightPct: null },
          { symbol: '3034', weightPct: null },
        ],
      }) as EtfFund
  ),
];

export type EtfHoldingView = {
  etf: string;
  name: string;
  weightPct?: number | null;
  changeNote?: string | null;
  note?: string;
  asOf?: string;
  source?: string;
};

/** 反查：股票被哪些 ETF 持有 */
export function etfsHolding(symbol: string): EtfHoldingView[] {
  const out: EtfHoldingView[] = [];
  for (const fund of ETF_FUNDS) {
    const h = fund.holdings.find((x) => x.symbol === symbol);
    if (!h) continue;
    out.push({
      etf: fund.etf,
      name: fund.name,
      weightPct: h.weightPct ?? null,
      changeNote: null,
      note: fund.source === 'active-theme-list' ? '主動/主題型（比重待公開檔）' : undefined,
      asOf: fund.asOf,
      source: fund.source,
    });
  }
  return out.sort((a, b) => (b.weightPct ?? -1) - (a.weightPct ?? -1));
}
