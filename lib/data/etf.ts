/**
 * 台股 ETF 持有對照（擴編）
 * weightPct / changeNote 有則顯示；無則「—」
 * 非投信即時申報；公開完整日頻持股需付費或各投信檔案。
 */
export type EtfHolding = {
  etf: string;
  name: string;
  note?: string;
  /** 持倉比重 %（若有） */
  weightPct?: number | null;
  /** 持倉增減說明（股數或文字，若有） */
  changeNote?: string | null;
};

const N = {
  t50: { etf: '0050', name: '元大台灣50' },
  fb50: { etf: '006208', name: '富邦台50' },
  tech: { etf: '0052', name: '富邦科技' },
  g5: { etf: '00881', name: '國泰台灣5G+' },
  div: { etf: '00878', name: '國泰永續高股息' },
  div2: { etf: '00919', name: '群益台灣精選高息' },
  sem: { etf: '00891', name: '中信關鍵半導體' },
  ai: { etf: '00912', name: '中信臺灣智慧50' },
  elec: { etf: '0053', name: '元大電子' },
  a403: { etf: '00403A', name: '統一台股增長主動' },
  a405: { etf: '00405A', name: '統一台灣高息動能主動' },
  a406: { etf: '00406A', name: '野村趨勢動能主動' },
  a980: { etf: '00980A', name: '保德信市值動能50主動' },
  a985: { etf: '00985A', name: '野村臺灣智慧車主動' },
  a991: { etf: '00991A', name: '群益台灣精選高息主動' },
  a993: { etf: '00993A', name: '中信成長高股息主動' },
  a994: { etf: '00994A', name: '中信綠能及電動車主動' },
  a995: { etf: '00995A', name: '新光臺灣半導體30主動' },
  a996: { etf: '00996A', name: '新光臺灣半導體高股息' },
} as const;

function pack(...items: EtfHolding[]): EtfHolding[] {
  return items;
}

export const ETF_HOLDERS: Record<string, EtfHolding[]> = {
  '2330': pack(
    { ...N.t50, note: '權重核心', weightPct: null },
    N.fb50,
    N.tech,
    N.g5,
    N.div2,
    N.sem,
    N.ai,
    N.elec,
    N.a403,
    N.a405
  ),
  '2303': pack(N.t50, N.fb50, N.tech, N.div, N.sem, N.a996, N.a995),
  '2454': pack(N.t50, N.fb50, N.tech, N.g5, N.elec, N.ai),
  '2317': pack(N.t50, N.fb50, N.tech, N.div, N.ai),
  '2382': pack(N.t50, N.fb50, N.tech, N.ai),
  '6669': pack(N.tech, N.g5, N.ai, N.elec),
  '3231': pack(N.tech, N.ai),
  '2356': pack(N.tech, N.div),
  '3711': pack(N.t50, N.fb50, N.tech, N.sem),
  '2308': pack(N.t50, N.fb50, N.div, N.ai),
  '2383': pack(N.tech, N.g5, N.ai),
  '3037': pack(N.tech, N.g5, N.ai),
  '8046': pack(N.tech, N.ai),
  '4958': pack(N.tech),
  '3017': pack(N.tech, N.ai),
  '3653': pack(N.tech, N.ai),
  '3324': pack(N.tech),
  '6230': pack(N.tech),
  '3443': pack(N.tech, N.sem, N.ai),
  '3661': pack(N.tech, N.sem, N.ai),
  '3035': pack(N.tech, N.sem),
  '2379': pack(N.tech, N.g5),
  '5274': pack(N.tech, N.ai),
  '2449': pack(N.tech, N.sem),
  '6257': pack(N.tech),
  '3189': pack(N.tech, N.sem),
  '6271': pack(N.tech),
  '6770': pack(N.tech, N.sem),
  '6488': pack(N.tech, N.sem),
  '3532': pack(N.tech, N.sem),
  '6182': pack(N.tech),
  // 華邦電 — 含使用者回報之主動/主題型 ETF（比重待公開檔補齊）
  '2344': pack(
    N.tech,
    N.sem,
    N.a403,
    N.a405,
    N.a406,
    N.a980,
    N.a985,
    N.a991,
    N.a993,
    N.a994,
    N.a995,
    N.a996
  ),
  '2408': pack(N.tech, N.sem, N.a995, N.a996),
  '2337': pack(N.tech, N.a995),
  '8299': pack(N.tech, N.g5),
  '4979': pack(N.tech, N.g5),
  '3081': pack(N.tech),
  '4977': pack(N.tech),
  '3363': pack(N.tech),
  '6643': pack(N.tech, N.sem),
  '6533': pack(N.tech, N.sem),
  '6213': pack(N.tech),
};

export function etfsHolding(symbol: string): EtfHolding[] {
  return ETF_HOLDERS[symbol] || [];
}
