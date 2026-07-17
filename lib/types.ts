export type Market = 'tw' | 'us' | 'jp';

export interface Theme {
  slug: string;
  title: string;
  description: string;
  market: Market;
  companyCount: number;
  verifiedAt: string; // ISO date
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
