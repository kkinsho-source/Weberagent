import type { Stock, Theme, SupplyEdge } from '../types';

/**
 * 編輯型領域資料（題材 / 供應鏈 / 產業標籤）
 * 報價由 TWSE / Supabase 覆蓋；此檔是地圖與主題的 source of truth。
 * 擴充股池時請同步：
 *  - supabase/themes_and_edges.sql
 *  - scripts/etl/push_to_supabase.py MOCK_CORE_SYMBOLS
 *  - scripts/etl/mops_announcements.py CORE_SYMBOLS
 */

export const themes: Theme[] = [
  {
    slug: 'ic_design_asic',
    title: 'IC 設計｜客製 ASIC 與矽智財',
    description:
      '隨著全球雲端服務供應商 (CSP) 積極推動「去輝達化」與晶片自研，矽智財 (IP Core) 授權與客製 ASIC 設計服務成為 AI 算力落地的核心基礎設施。',
    market: 'tw',
    companyCount: 5,
    verifiedAt: '2026-06-24',
  },
  {
    slug: 'ic_design_hpc',
    title: 'IC 設計｜HPC 與網通 IC',
    description:
      '聚焦於 AI 資料中心、高效能運算 (HPC) 與 5G/WiFi 網通核心晶片的產品型 Fabless IC 設計公司。',
    market: 'tw',
    companyCount: 3,
    verifiedAt: '2026-06-30',
  },
  {
    slug: 'foundry',
    title: '晶圓代工',
    description: '先進製程與成熟製程晶圓代工，AI 與 HPC 需求的核心產能提供者。',
    market: 'tw',
    companyCount: 3,
    verifiedAt: '2026-06-30',
  },
  {
    slug: 'advanced_packaging',
    title: 'AI 先進封裝',
    description: 'CoWoS、SoIC、載板與測試等先進封裝產能為 AI 晶片落地的關鍵瓶頸。',
    market: 'tw',
    companyCount: 5,
    verifiedAt: '2026-07-01',
  },
  {
    slug: 'ai_server',
    title: 'AI 伺服器組裝',
    description: 'AI 機柜與伺服器組裝 ODM，受惠雲端資本支出結構性成長。',
    market: 'tw',
    companyCount: 5,
    verifiedAt: '2026-07-02',
  },
  {
    slug: 'pcb_ccl',
    title: 'PCB / CCL 載板',
    description: 'AI 伺服器所需高頻高速 PCB、IC 載板與銅箔基板供應鏈。',
    market: 'tw',
    companyCount: 5,
    verifiedAt: '2026-07-03',
  },
  {
    slug: 'thermal_power',
    title: 'AI 散熱與電源',
    description: '液冷、均熱板、高瓦數電源與電源管理，承接 AI 機櫃熱密度與耗電暴增。',
    market: 'tw',
    companyCount: 5,
    verifiedAt: '2026-07-15',
  },
  {
    slug: 'optical_cpo',
    title: '光通訊 / CPO',
    description: '資料中心高速光模組、矽光與 CPO 相關供應鏈，承接 GPU 叢集互聯頻寬需求。',
    market: 'tw',
    companyCount: 4,
    verifiedAt: '2026-07-15',
  },
];

export const stocks: Stock[] = [
  // IC 設計｜ASIC / IP
  { symbol: '3443', name: '創意', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_asic', price: 1080, changePct: 3.21, marketCap: 1620 },
  { symbol: '3661', name: '世芯-KY', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_asic', price: 2750, changePct: 1.85, marketCap: 2100 },
  { symbol: '3035', name: '智原', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_asic', price: 312, changePct: -0.64, marketCap: 380 },
  { symbol: '6643', name: 'M31', market: 'tw', industry: 'IP', themeSlug: 'ic_design_asic', price: 405, changePct: 2.1, marketCap: 210 },
  { symbol: '6533', name: '晶心科', market: 'tw', industry: 'IP', themeSlug: 'ic_design_asic', price: 498, changePct: 4.55, marketCap: 520 },
  // IC 設計｜HPC
  { symbol: '2454', name: '聯發科', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_hpc', price: 1280, changePct: 0.95, marketCap: 20000 },
  { symbol: '2379', name: '瑞昱', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_hpc', price: 568, changePct: 1.2, marketCap: 2900 },
  { symbol: '5274', name: '信驊', market: 'tw', industry: 'IC 設計', themeSlug: 'ic_design_hpc', price: 2980, changePct: 2.4, marketCap: 2400 },
  // 晶圓代工
  { symbol: '2330', name: '台積電', market: 'tw', industry: '晶圓代工', themeSlug: 'foundry', price: 1180, changePct: 1.55, marketCap: 306000 },
  { symbol: '2303', name: '聯電', market: 'tw', industry: '晶圓代工', themeSlug: 'foundry', price: 52.5, changePct: 0.38, marketCap: 6600 },
  { symbol: '6770', name: '力積電', market: 'tw', industry: '晶圓代工', themeSlug: 'foundry', price: 28, changePct: 0.5, marketCap: 900 },
  // 先進封裝 / 測試 / 載板
  { symbol: '3711', name: '日月光投控', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 185, changePct: 2.78, marketCap: 7800 },
  { symbol: '2449', name: '京元電', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 132, changePct: 1.95, marketCap: 1650 },
  { symbol: '6257', name: '矽格', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 118, changePct: 0.85, marketCap: 720 },
  { symbol: '3189', name: '景碩', market: 'tw', industry: 'IC 載板', themeSlug: 'advanced_packaging', price: 180, changePct: 1.2, marketCap: 1600 },
  { symbol: '6271', name: '同欣電', market: 'tw', industry: '封測', themeSlug: 'advanced_packaging', price: 220, changePct: 0.9, marketCap: 600 },
  // AI 伺服器 ODM
  { symbol: '2317', name: '鴻海', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 218, changePct: 3.32, marketCap: 30500 },
  { symbol: '2382', name: '廣達', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 368, changePct: 2.1, marketCap: 14800 },
  { symbol: '6669', name: '緯穎', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 2980, changePct: 1.45, marketCap: 5200 },
  { symbol: '3231', name: '緯創', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 140, changePct: 1.1, marketCap: 4200 },
  { symbol: '2356', name: '英業達', market: 'tw', industry: '組裝', themeSlug: 'ai_server', price: 55, changePct: 0.8, marketCap: 2000 },
  // PCB / CCL
  { symbol: '4958', name: '臻鼎-KY', market: 'tw', industry: 'PCB', themeSlug: 'pcb_ccl', price: 168, changePct: 1.12, marketCap: 2600 },
  { symbol: '3037', name: '欣興', market: 'tw', industry: 'PCB', themeSlug: 'pcb_ccl', price: 175, changePct: 0.92, marketCap: 2700 },
  { symbol: '8046', name: '南電', market: 'tw', industry: 'PCB', themeSlug: 'pcb_ccl', price: 1270, changePct: 18.1, marketCap: 3900 },
  { symbol: '2383', name: '台光電', market: 'tw', industry: 'CCL', themeSlug: 'pcb_ccl', price: 420, changePct: 0.26, marketCap: 3100 },
  { symbol: '6213', name: '聯茂', market: 'tw', industry: 'CCL', themeSlug: 'pcb_ccl', price: 95, changePct: 0.5, marketCap: 800 },
  // AI 散熱與電源
  { symbol: '2308', name: '台達電', market: 'tw', industry: '電源', themeSlug: 'thermal_power', price: 420, changePct: 1.0, marketCap: 11000 },
  { symbol: '3017', name: '奇鋐', market: 'tw', industry: '散熱', themeSlug: 'thermal_power', price: 680, changePct: 2.2, marketCap: 2400 },
  { symbol: '3653', name: '健策', market: 'tw', industry: '散熱', themeSlug: 'thermal_power', price: 920, changePct: 1.5, marketCap: 1100 },
  { symbol: '3324', name: '雙鴻', market: 'tw', industry: '散熱', themeSlug: 'thermal_power', price: 620, changePct: 1.8, marketCap: 900 },
  { symbol: '6230', name: '超眾', market: 'tw', industry: '散熱', themeSlug: 'thermal_power', price: 280, changePct: 0.7, marketCap: 400 },
  // 光通訊 / CPO
  { symbol: '4979', name: '華星光', market: 'tw', industry: '光通訊', themeSlug: 'optical_cpo', price: 180, changePct: 2.5, marketCap: 350 },
  { symbol: '3363', name: '上詮', market: 'tw', industry: '光通訊', themeSlug: 'optical_cpo', price: 95, changePct: 1.3, marketCap: 200 },
  { symbol: '3081', name: '聯亞', market: 'tw', industry: '光通訊', themeSlug: 'optical_cpo', price: 420, changePct: 3.1, marketCap: 450 },
  { symbol: '4977', name: '眾達-KY', market: 'tw', industry: '光通訊', themeSlug: 'optical_cpo', price: 260, changePct: 1.6, marketCap: 280 },
];

// 製程流向：from = 上游, to = 下游；relation=downstream 表示 from 供貨給 to
export const supplyEdges: SupplyEdge[] = [
  // ASIC / IP / HPC → 代工
  { from: '3443', to: '2330', relation: 'downstream' },
  { from: '3661', to: '2330', relation: 'downstream' },
  { from: '3035', to: '2330', relation: 'downstream' },
  { from: '6643', to: '2330', relation: 'downstream' },
  { from: '6533', to: '2330', relation: 'downstream' },
  { from: '2454', to: '2330', relation: 'downstream' },
  { from: '2379', to: '2330', relation: 'downstream' },
  { from: '5274', to: '2330', relation: 'downstream' },
  { from: '2454', to: '2303', relation: 'downstream' },
  // 代工 → 封測
  { from: '2330', to: '3711', relation: 'downstream' },
  { from: '2330', to: '2449', relation: 'downstream' },
  { from: '2330', to: '6257', relation: 'downstream' },
  { from: '2330', to: '6271', relation: 'downstream' },
  { from: '2303', to: '3711', relation: 'downstream' },
  { from: '6770', to: '3711', relation: 'downstream' },
  // 載板 → 封測 / 伺服器
  { from: '3189', to: '3711', relation: 'downstream' },
  { from: '3189', to: '2330', relation: 'downstream' },
  { from: '8046', to: '3711', relation: 'downstream' },
  { from: '3037', to: '3711', relation: 'downstream' },
  // 封測 → 伺服器 ODM
  { from: '3711', to: '2317', relation: 'downstream' },
  { from: '3711', to: '2382', relation: 'downstream' },
  { from: '3711', to: '6669', relation: 'downstream' },
  { from: '3711', to: '3231', relation: 'downstream' },
  { from: '3711', to: '2356', relation: 'downstream' },
  // PCB / CCL → 伺服器
  { from: '8046', to: '2317', relation: 'downstream' },
  { from: '3037', to: '2317', relation: 'downstream' },
  { from: '2383', to: '2317', relation: 'downstream' },
  { from: '2383', to: '2382', relation: 'downstream' },
  { from: '4958', to: '2382', relation: 'downstream' },
  { from: '6213', to: '2382', relation: 'downstream' },
  { from: '3037', to: '6669', relation: 'downstream' },
  // 散熱 / 電源 → 伺服器
  { from: '2308', to: '2317', relation: 'downstream' },
  { from: '2308', to: '2382', relation: 'downstream' },
  { from: '2308', to: '6669', relation: 'downstream' },
  { from: '3017', to: '2317', relation: 'downstream' },
  { from: '3017', to: '6669', relation: 'downstream' },
  { from: '3653', to: '2382', relation: 'downstream' },
  { from: '3653', to: '6669', relation: 'downstream' },
  { from: '3324', to: '2382', relation: 'downstream' },
  { from: '6230', to: '3231', relation: 'downstream' },
  // 光通訊 → 伺服器 / 資料中心
  { from: '4979', to: '6669', relation: 'downstream' },
  { from: '4979', to: '2382', relation: 'downstream' },
  { from: '3363', to: '6669', relation: 'downstream' },
  { from: '3081', to: '4979', relation: 'downstream' },
  { from: '4977', to: '2382', relation: 'downstream' },
  // 競品（同層）
  { from: '2330', to: '2303', relation: 'competitor' },
  { from: '2317', to: '2382', relation: 'competitor' },
  { from: '2382', to: '6669', relation: 'competitor' },
  { from: '3017', to: '3653', relation: 'competitor' },
  { from: '3443', to: '3661', relation: 'competitor' },
];

export function getTheme(slug: string): Theme | undefined {
  return themes.find((t) => t.slug === slug);
}

export function getStocksByTheme(slug: string): Stock[] {
  return stocks.filter((s) => s.themeSlug === slug);
}

/** 核心股池代號（ETL / cron 用） */
export const CORE_SYMBOLS: string[] = stocks.map((s) => s.symbol);
