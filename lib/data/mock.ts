import type { Stock, Theme, SupplyEdge } from '../types';

export const themes: Theme[] = [
  {
    slug: 'ic_design_asic',
    title: 'IC 設計｜客製 ASIC 與矽智財',
    description:
      '隨著全球雲端服務供應商 (CSP) 積極推動「去輝達化」與晶片自研，矽智財 (IP Core) 授權與客製 ASIC 設計服務成為 AI 算力落地的核心基礎設施。',
    market: 'tw',
    companyCount: 15,
    verifiedAt: '2026-06-24',
  },
  {
    slug: 'ic_design_hpc',
    title: 'IC 設計｜HPC 與網通 IC',
    description:
      '聚焦於 AI 資料中心、高效能運算 (HPC) 與 5G/WiFi 網通核心晶片的產品型 Fabless IC 設計公司。',
    market: 'tw',
    companyCount: 14,
    verifiedAt: '2026-06-30',
  },
  {
    slug: 'foundry',
    title: '晶圓代工',
    description: '先進製程與成熟製程晶圓代工，AI 與 HPC 需求的核心產能提供者。',
    market: 'tw',
    companyCount: 4,
    verifiedAt: '2026-06-30',
  },
  {
    slug: 'advanced_packaging',
    title: 'AI 先進封裝',
    description: 'CoWoS、SoIC 等先進封裝產能為 AI 晶片落地的關鍵瓶頸與戰略資源。',
    market: 'tw',
    companyCount: 9,
    verifiedAt: '2026-07-01',
  },
  {
    slug: 'ai_server',
    title: 'AI 伺服器組裝',
    description: 'AI 機柜與伺服器組裝 ODM，受惠雲端資本支出結構性成長。',
    market: 'tw',
    companyCount: 6,
    verifiedAt: '2026-07-02',
  },
  {
    slug: 'pcb_ccl',
    title: 'PCB / CCL 載板',
    description: 'AI 伺服器所需高頻高速 PCB、IC 載板與銅箔基板供應鏈。',
    market: 'tw',
    companyCount: 11,
    verifiedAt: '2026-07-03',
  },
];

export const stocks: Stock[] = [
  { symbol: '3443', name: '創意', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_asic', price: 1080, changePct: 3.21, marketCap: 1620 },
  { symbol: '3661', name: '世芯-KY', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_asic', price: 2750, changePct: 1.85, marketCap: 2100 },
  { symbol: '3035', name: '智原', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_asic', price: 312, changePct: -0.64, marketCap: 380 },
  { symbol: '6643', name: 'M31', market: 'tw', industry: 'IP', themeSlug: 'ic_design_asic', price: 405, changePct: 2.10, marketCap: 210 },
  { symbol: '6533', name: '晶心科', market: 'tw', industry: 'IP', themeSlug: 'ic_design_asic', price: 498, changePct: 4.55, marketCap: 520 },
  { symbol: '2454', name: '聯發科', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_hpc', price: 1280, changePct: 0.95, marketCap: 20000 },
  { symbol: '2379', name: '瑞昱', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_hpc', price: 568, changePct: 1.20, marketCap: 2900 },
  { symbol: '5274', name: '信驊', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_hpc', price: 2980, changePct: 2.40, marketCap: 2400 },
  { symbol: '2330', name: '台積電', market: 'tw', industry: '晶圓代工', themeSlug: 'foundry', price: 1180, changePct: 1.55, marketCap: 306000 },
  { symbol: '2303', name: '聯電', market: 'tw', industry: '晶圓代工', themeSlug: 'foundry', price: 52.5, changePct: 0.38, marketCap: 6600 },
  { symbol: '3711', name: '日月光投控', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 185, changePct: 2.78, marketCap: 7800 },
  { symbol: '2449', name: '京元電', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 132, changePct: 1.95, marketCap: 1650 },
  { symbol: '6257', name: '矽格', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 118, changePct: 0.85, marketCap: 720 },
  { symbol: '2317', name: '鴻海', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 218, changePct: 3.32, marketCap: 30500 },
  { symbol: '2382', name: '廣達', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 368, changePct: 2.10, marketCap: 14800 },
  { symbol: '6669', name: '緯穎', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 2980, changePct: 1.45, marketCap: 5200 },
  { symbol: '4958', name: '臻鼎-KY', market: 'tw', industry: 'PCB', themeSlug: 'pcb_ccl', price: 168, changePct: 1.12, marketCap: 2600 },
  { symbol: '3037', name: '欣興', market: 'tw', industry: 'PCB', themeSlug: 'pcb_ccl', price: 175, changePct: 0.92, marketCap: 2700 },
  { symbol: '8046', name: '南電', market: 'tw', industry: 'PCB', themeSlug: 'pcb_ccl', price: 1270, changePct: 18.1, marketCap: 3900 },
  { symbol: '2383', name: '台光電', market: 'tw', industry: 'CCL', themeSlug: 'pcb_ccl', price: 420, changePct: 0.26, marketCap: 3100 },
];

// 製程流向：source = 前段(上游), target = 後段(下游)
export const supplyEdges: SupplyEdge[] = [
  { from: '3443', to: '2330', relation: 'downstream' },
  { from: '3661', to: '2330', relation: 'downstream' },
  { from: '3035', to: '2330', relation: 'downstream' },
  { from: '6643', to: '2330', relation: 'downstream' },
  { from: '6533', to: '2330', relation: 'downstream' },
  { from: '2454', to: '2330', relation: 'downstream' },
  { from: '2379', to: '2330', relation: 'downstream' },
  { from: '5274', to: '2330', relation: 'downstream' },
  { from: '2330', to: '3711', relation: 'downstream' },
  { from: '2330', to: '2449', relation: 'downstream' },
  { from: '2330', to: '6257', relation: 'downstream' },
  { from: '3711', to: '2317', relation: 'downstream' },
  { from: '3711', to: '2382', relation: 'downstream' },
  { from: '3711', to: '6669', relation: 'downstream' },
  { from: '8046', to: '2317', relation: 'downstream' },
  { from: '3037', to: '2317', relation: 'downstream' },
  { from: '2383', to: '2317', relation: 'downstream' },
];

export function getTheme(slug: string): Theme | undefined {
  return themes.find((t) => t.slug === slug);
}

export function getStocksByTheme(slug: string): Stock[] {
  return stocks.filter((s) => s.themeSlug === slug);
}
