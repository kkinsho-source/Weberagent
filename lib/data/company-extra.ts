/**
 * 公司主業 / 產品一句（編輯型）+ 官網網域推估
 */
export type CompanyExtra = {
  product?: string;
  website?: string;
};

export const COMPANY_EXTRAS: Record<string, CompanyExtra> = {
  '2330': {
    product: '晶圓代工與先進封裝，全球邏輯製程領導者。',
    website: 'https://www.tsmc.com',
  },
  '2303': {
    product: '晶圓代工（成熟與特殊製程）。',
    website: 'https://www.umc.com',
  },
  '2454': {
    product: '手機/平台與 AI/邊緣運算 SoC 與 ASIC。',
    website: 'https://www.mediatek.com',
  },
  '2344': {
    product: '利基型 DRAM、NOR Flash 與記憶體相關產品。',
    website: 'https://www.winbond.com',
  },
  '2408': {
    product: 'DRAM 與相關記憶體產品。',
    website: 'https://www.nanya.com',
  },
  '3711': {
    product: '半導體封測與測試服務。',
    website: 'https://www.aseglobal.com',
  },
  '2317': {
    product: '電子代工製造與系統組裝。',
    website: 'https://www.foxconn.com',
  },
  '2382': {
    product: '伺服器與電腦系統 ODM。',
    website: 'https://www.quantatw.com',
  },
  '6669': {
    product: 'AI 伺服器與高階機櫃 ODM。',
    website: 'https://www.wiwynn.com',
  },
  '3017': {
    product: '伺服器散熱與相關機構解決方案。',
    website: 'https://www.avc.com.tw',
  },
  '3443': {
    product: '矽智財與客製 ASIC 設計服務。',
    website: 'https://www.gsitechnology.com',
  },
  '3661': {
    product: '高速介面 IP 與客製晶片設計。',
    website: 'https://www.alchip.com',
  },
};

export function companyExtraOf(symbol: string): CompanyExtra {
  return COMPANY_EXTRAS[symbol] || {};
}
