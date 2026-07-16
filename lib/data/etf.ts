/**
 * 台股 ETF 持有示意（擴編版 SSOT）
 * 反查：某股票被哪些常見 ETF 納入。非即時權重。
 */
export type EtfHolding = {
  etf: string;
  name: string;
  note?: string;
};

const E = {
  t50: { etf: '0050', name: '元大台灣50' },
  fb50: { etf: '006208', name: '富邦台50' },
  tech: { etf: '0052', name: '富邦科技' },
  g5: { etf: '00881', name: '國泰台灣5G+' },
  div: { etf: '00878', name: '國泰永續高股息' },
  div2: { etf: '00919', name: '群益台灣精選高息' },
  sem: { etf: '00891', name: '中信關鍵半導體' },
  ai: { etf: '00912', name: '中信臺灣智慧 50' },
  elec: { etf: '0053', name: '元大電子' },
} as const;

function pack(...items: Array<EtfHolding & { note?: string }>): EtfHolding[] {
  return items;
}

/** symbol -> ETFs（核心股盡量覆蓋） */
export const ETF_HOLDERS: Record<string, EtfHolding[]> = {
  '2330': pack(
    { ...E.t50, note: '權重核心' },
    E.fb50,
    E.tech,
    E.g5,
    E.div2,
    E.sem,
    E.ai,
    E.elec
  ),
  '2303': pack(E.t50, E.fb50, E.tech, E.div, E.sem),
  '2454': pack(E.t50, E.fb50, E.tech, E.g5, E.elec, E.ai),
  '2317': pack(E.t50, E.fb50, E.tech, E.div, E.ai),
  '2382': pack(E.t50, E.fb50, E.tech, E.ai),
  '6669': pack(E.tech, E.g5, E.ai, E.elec),
  '3231': pack(E.tech, E.ai),
  '2356': pack(E.tech, E.div),
  '3711': pack(E.t50, E.fb50, E.tech, E.sem),
  '2308': pack(E.t50, E.fb50, E.div, E.ai),
  '2383': pack(E.tech, E.g5, E.ai),
  '3037': pack(E.tech, E.g5, E.ai),
  '8046': pack(E.tech, E.ai),
  '4958': pack(E.tech),
  '3017': pack(E.tech, E.ai),
  '3653': pack(E.tech, E.ai),
  '3324': pack(E.tech),
  '6230': pack(E.tech),
  '3443': pack(E.tech, E.sem, E.ai),
  '3661': pack(E.tech, E.sem, E.ai),
  '3035': pack(E.tech, E.sem),
  '2379': pack(E.tech, E.g5),
  '5274': pack(E.tech, E.ai),
  '2449': pack(E.tech, E.sem),
  '6257': pack(E.tech),
  '3189': pack(E.tech, E.sem),
  '6271': pack(E.tech),
  '6770': pack(E.tech, E.sem),
  '6488': pack(E.tech, E.sem),
  '3532': pack(E.tech, E.sem),
  '6182': pack(E.tech),
  '2344': pack(E.tech, E.sem),
  '2408': pack(E.tech, E.sem),
  '2337': pack(E.tech),
  '8299': pack(E.tech, E.g5),
  '4979': pack(E.tech, E.g5),
  '3081': pack(E.tech),
  '4977': pack(E.tech),
  '3363': pack(E.tech),
  '6643': pack(E.tech, E.sem),
  '6533': pack(E.tech, E.sem),
  '6213': pack(E.tech),
};

export function etfsHolding(symbol: string): EtfHolding[] {
  return ETF_HOLDERS[symbol] || [];
}
