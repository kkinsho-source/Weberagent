export type Market = 'tw' | 'us' | 'jp';

/** 題材分層：0 全市場粗網｜1 AI 供應鏈細題｜2 預留更細拆 */
export type ThemeTier = 0 | 1 | 2;

/**
 * 題材族系（資金雷達 scope / 地圖分組用）
 * - ai_chain: Tier-1 半導體／AI 供應鏈
 * - defensive: 金融、電信等
 * - cyclical: 航運、塑化、鋼鐵水泥、營建、汽車等
 * - electronics_ex_ai: 其他電子（非 AI 主鏈）
 * - other: 生技、消費、綠能、觀光等
 * - benchmark: 相對強弱分母用，通常不當一般泡泡
 */
export type ThemeFamily =
  | 'ai_chain'
  | 'defensive'
  | 'cyclical'
  | 'electronics_ex_ai'
  | 'other'
  | 'benchmark';

export interface Theme {
  slug: string;
  title: string;
  description: string;
  market: Market;
  companyCount: number;
  verifiedAt: string; // ISO date
  /** 分層；缺省視為 1（舊資料相容） */
  tier: ThemeTier;
  /** 族系；缺省視為 ai_chain */
  family: ThemeFamily;
  /** 資金雷達預設是否納入；缺省 true（benchmark 應 false） */
  radarDefault: boolean;
}

export interface Stock {
  symbol: string;
  name: string;
  market: Market;
  industry: string;
  themeSlug: string;
  price: number;
  changePct: number;
  marketCap: number; // 億
  /** 報價所屬交易日（YYYY-MM-DD）；Q1 overlay 會寫入最新日 K 日期 */
  asOf?: string;
}

export interface SupplyEdge {
  from: string; // stock symbol or theme slug
  to: string;
  relation: 'upstream' | 'downstream' | 'competitor';
}
