/**
 * 規則式 AI 洞察（無外部 LLM key 也能用；之後可接 LLM）
 */
import type { Stock } from '@/lib/types';
import type { OhlcBar } from '@/lib/etl/history';

export type Insight = {
  stance: 'bullish' | 'neutral' | 'bearish';
  score: number; // -100 ~ 100
  summary: string;
  bullets: string[];
  risks: string[];
  sources: string[];
};

function pct(from: number, to: number): number {
  if (!from) return 0;
  return Math.round(((to - from) / from) * 10000) / 100;
}

export function buildRuleInsights(opts: {
  stock: Stock;
  bars: OhlcBar[];
  mopsTitles?: string[];
  revenueYoy?: number | null;
  epsLatest?: number | null;
}): Insight {
  const { stock, bars, mopsTitles = [], revenueYoy, epsLatest } = opts;
  let score = 0;
  const bullets: string[] = [];
  const risks: string[] = [];
  const sources: string[] = ['股價日線', '供應鏈題材', '重大訊息'];

  // 短期動能
  if (bars.length >= 5) {
    const last = bars[bars.length - 1].close;
    const d5 = bars[Math.max(0, bars.length - 6)].close;
    const ch5 = pct(d5, last);
    score += Math.max(-25, Math.min(25, ch5 * 2));
    bullets.push(`近 5 日價格變動約 ${ch5 >= 0 ? '+' : ''}${ch5}%`);
  }
  if (bars.length >= 20) {
    const last = bars[bars.length - 1].close;
    const d20 = bars[bars.length - 21].close;
    const ch20 = pct(d20, last);
    score += Math.max(-30, Math.min(30, ch20));
    bullets.push(`近 20 日價格變動約 ${ch20 >= 0 ? '+' : ''}${ch20}%`);
    if (ch20 < -10) risks.push('中期回檔幅度偏大，注意動能反轉與停損');
  }

  // 當日
  score += Math.max(-15, Math.min(15, stock.changePct * 3));
  bullets.push(
    `今日 ${stock.changePct >= 0 ? '上漲' : '下跌'} ${Math.abs(stock.changePct).toFixed(2)}%，股價 ${stock.price.toLocaleString()}`
  );

  // 題材
  const themeMap: Record<string, string> = {
    foundry: '晶圓代工為 AI 算力產能核心，長線資本支出敏感',
    advanced_packaging: '先進封裝為 AI 晶片瓶頸環節，產能能見度關鍵',
    ai_server: 'AI 伺服器組裝受 CSP capex 週期影響',
    ic_design_asic: '客製 ASIC / IP 受惠 CSP 自研晶片趨勢',
    ic_design_hpc: 'HPC / 網通 IC 與資料中心需求連動',
    pcb_ccl: '高階 PCB/CCL 受 AI 伺服器規格升級帶動',
    thermal_power: 'AI 機櫃熱密度與耗電暴增，散熱與電源為結構性剛需',
    optical_cpo: 'GPU 叢集互聯頻寬驅動高速光模組 / CPO 需求',
  };
  if (themeMap[stock.themeSlug]) {
    bullets.push(themeMap[stock.themeSlug]);
    score += 5;
  }

  // 營收 / EPS
  if (revenueYoy != null) {
    sources.push('證交所月營收');
    score += Math.max(-20, Math.min(20, revenueYoy / 2));
    bullets.push(`最新月營收年增約 ${revenueYoy >= 0 ? '+' : ''}${revenueYoy.toFixed(1)}%`);
    if (revenueYoy < -15) risks.push('營收年減幅度偏大，需核對產品組合與基期');
  }
  if (epsLatest != null) {
    sources.push('證交所季報 EPS');
    if (epsLatest > 0) {
      score += 8;
      bullets.push(`最近一季 EPS ${epsLatest.toFixed(2)} 元（正值）`);
    } else {
      score -= 10;
      risks.push(`最近一季 EPS ${epsLatest.toFixed(2)} 元，獲利承壓`);
    }
  }

  // MOPS
  if (mopsTitles.length) {
    sources.push('MOPS 重大訊息');
    const text = mopsTitles.join(' ');
    const pos = /取得|簽訂|訂單|擴產|通過|合作|獲利|配發|現金股利/.test(text);
    const neg = /減資|虧損|訴訟|延遲|暫停|違約|重訊更正|停工/.test(text);
    if (pos) {
      score += 8;
      bullets.push(`近期重大訊息偏正面關鍵字（樣本：${mopsTitles[0].slice(0, 28)}…）`);
    }
    if (neg) {
      score -= 12;
      risks.push(`近期重大訊息出現風險關鍵字（樣本：${mopsTitles.find((t) => /減資|虧損|訴訟|延遲|暫停|違約/.test(t))?.slice(0, 28) || mopsTitles[0].slice(0, 28)}…）`);
    }
    if (!pos && !neg) {
      bullets.push(`近有 ${mopsTitles.length} 則重大訊息，建議點開「重大訊息」分頁詳讀`);
    }
  } else {
    bullets.push('近期待補重大訊息樣本，建議切換重大訊息分頁');
  }

  score = Math.max(-100, Math.min(100, Math.round(score)));
  const stance: Insight['stance'] =
    score >= 20 ? 'bullish' : score <= -20 ? 'bearish' : 'neutral';
  const label = stance === 'bullish' ? '偏多' : stance === 'bearish' ? '偏空' : '中性';
  const summary = `${stock.name}（${stock.symbol}）綜合評分 ${score}（${label}）。以價格動能、題材位置與公開財報/重訊規則加權，非正式投資建議。`;

  if (risks.length === 0) {
    risks.push('總體市場波動、匯率與地緣政治可能影響評價');
    risks.push('規則引擎無法涵蓋完整基本面與籌碼，請交叉驗證');
  }

  return { stance, score, summary, bullets, risks, sources };
}
