import type { Stock, Theme, SupplyEdge } from '../types';
import coreUniverse from './core_universe.json';

/**
 * 編輯型領域資料（題材 / 供應鏈）
 * 核心股池 SSOT：lib/data/core_universe.json（TS + Python ETL 共用）
 * 擴股：改 core_universe.json，並更新 edges / themes / SQL
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
  {
    slug: 'materials_wafer',
    title: '矽晶圓與半導體材料',
    description: '12 吋矽晶圓、磊晶與關鍵半導體材料，位於先進製程最上游。',
    market: 'tw',
    companyCount: 3,
    verifiedAt: '2026-07-16',
  },
  {
    slug: 'memory_hbm',
    title: '記憶體 / HBM 相關',
    description: 'DRAM/NAND 與控制器、模組，承接 AI 訓練與推論記憶體頻寬需求。',
    market: 'tw',
    companyCount: 4,
    verifiedAt: '2026-07-16',
  },
];

export const stocks: Stock[] = (coreUniverse.stocks as Array<{
  symbol: string;
  name: string;
  industry: string;
  themeSlug: string;
  marketCap: number;
}>).map((s) => ({
  symbol: s.symbol,
  name: s.name,
  market: 'tw' as const,
  industry: s.industry,
  themeSlug: s.themeSlug,
  price: 0,
  changePct: 0,
  marketCap: s.marketCap,
}));

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
  // 矽晶圓 → 代工
  { from: '6488', to: '2330', relation: 'downstream' },
  { from: '6488', to: '2303', relation: 'downstream' },
  { from: '3532', to: '2330', relation: 'downstream' },
  { from: '6182', to: '2303', relation: 'downstream' },
  { from: '6182', to: '6770', relation: 'downstream' },
  // 記憶體 → 封測 / 伺服器
  { from: '2344', to: '3711', relation: 'downstream' },
  { from: '2408', to: '3711', relation: 'downstream' },
  { from: '2337', to: '3711', relation: 'downstream' },
  { from: '8299', to: '2317', relation: 'downstream' },
  { from: '8299', to: '6669', relation: 'downstream' },
  { from: '2408', to: '6669', relation: 'downstream' },
  // 競品（同層）
  { from: '2330', to: '2303', relation: 'competitor' },
  { from: '2317', to: '2382', relation: 'competitor' },
  { from: '2382', to: '6669', relation: 'competitor' },
  { from: '3017', to: '3653', relation: 'competitor' },
  { from: '3443', to: '3661', relation: 'competitor' },
  { from: '6488', to: '3532', relation: 'competitor' },
  { from: '2344', to: '2408', relation: 'competitor' },
];

export function getTheme(slug: string): Theme | undefined {
  return themes.find((t) => t.slug === slug);
}

export function getStocksByTheme(slug: string): Stock[] {
  return stocks.filter((s) => s.themeSlug === slug);
}

/** 核心股池代號（ETL / cron 用） */
export const CORE_SYMBOLS: string[] = stocks.map((s) => s.symbol);
