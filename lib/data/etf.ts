/**
 * 台股 ETF 持有示意（編輯型 SSOT）
 * 反查：某股票被哪些常見 ETF 納入。非即時權重，僅供導覽。
 */
export type EtfHolding = {
  etf: string;
  name: string;
  note?: string;
};

/** symbol -> ETFs */
export const ETF_HOLDERS: Record<string, EtfHolding[]> = {
  '2330': [
    { etf: '0050', name: '元大台灣50', note: '權重核心' },
    { etf: '006208', name: '富邦台50' },
    { etf: '0052', name: '富邦科技' },
    { etf: '00881', name: '國泰台灣5G+' },
    { etf: '00919', name: '群益台灣精選高息' },
  ],
  '2317': [
    { etf: '0050', name: '元大台灣50' },
    { etf: '0052', name: '富邦科技' },
    { etf: '00878', name: '國泰永續高股息' },
  ],
  '2454': [
    { etf: '0050', name: '元大台灣50' },
    { etf: '0052', name: '富邦科技' },
    { etf: '00881', name: '國泰台灣5G+' },
  ],
  '2308': [
    { etf: '0050', name: '元大台灣50' },
    { etf: '00878', name: '國泰永續高股息' },
  ],
  '2382': [
    { etf: '0050', name: '元大台灣50' },
    { etf: '0052', name: '富邦科技' },
  ],
  '6669': [
    { etf: '0052', name: '富邦科技' },
    { etf: '00881', name: '國泰台灣5G+' },
  ],
  '3711': [
    { etf: '0050', name: '元大台灣50' },
    { etf: '0052', name: '富邦科技' },
  ],
  '2303': [
    { etf: '0050', name: '元大台灣50' },
    { etf: '00878', name: '國泰永續高股息' },
  ],
  '3037': [{ etf: '0052', name: '富邦科技' }],
  '2383': [{ etf: '0052', name: '富邦科技' }],
  '3017': [{ etf: '0052', name: '富邦科技' }],
  '3653': [{ etf: '0052', name: '富邦科技' }],
  '6488': [{ etf: '0052', name: '富邦科技' }],
  '2344': [{ etf: '0052', name: '富邦科技' }],
};

export function etfsHolding(symbol: string): EtfHolding[] {
  return ETF_HOLDERS[symbol] || [];
}
