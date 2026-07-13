# AI 智慧產業地圖 — 完整專案規劃文件

> 產品定位：打造超越 [aistockmap.com](https://aistockmap.com) 的互動式 AI 產業地圖
> 涵蓋：台股 / 美股 / 日股 的產業供應鏈視覺化、投資題材分析、每日市場焦點與 AI 輔助洞察
> 版本：v1.1 · 2026-07-13 · 作者：威柏（HERMES）× 阿剛

---

## 0. 現況摘要（截至本規劃日）

已完成（可執行、已驗證）：
- Next.js 15 (App Router) + TypeScript + Tailwind 專案骨架，production build 通過（7 路由）
- React Flow 互動式供應鏈地圖：首頁全圖（20 檔半導體節點）+ 題材頁鑽取子圖，點擊高亮上下游，瀏覽器實測通過
- 真實台股 mock 資料：20 檔個股 + 6 題材 + 17 條供應鏈關係
- DevOps：Dockerfile / docker-compose / 單元測試 / git 初始化（commit `9109734`）
- 長期記憶：檔案僅存 `D:\weberanent\`；使用者「阿剛」、Agent「威柏」

待補：
- 個股頁上下游子圖（仍是 placeholder）
- 真實資料源（Supabase + ETL）尚未接入，目前數字為靜態示意
- 付費牆 / Auth / AI 分析模組尚未實作

---

## 1. 競品對標（aistockmap.com 實際功能拆解）

| 模組 | 對手現狀 | 我方超越策略 |
|---|---|---|
| 產業地圖 | 分類卡片 / 泳道圖（非可探索節點圖） | **React Flow 互動節點圖**（已做 POC）：點題材展開公司、點公司高亮上下游、可鑽取 |
| 題材總覽 | IC 設計（ASIC/IP、HPC 網通、類比功率）等，含描述+核實日期 | 同；加 AI 自動生成描述初稿 |
| 今日漲跌焦點 | 產業類別 + 漲跌幅 + 家數 | 保留＋加 ECharts 熱力圖 treemap |
| 市場切換 | 台 / 美 / 日 / 產業鏈 / ETF | 同，router 預載 |
| 每日焦點 | 產業新聞（中央社/經濟日報/鉅亨/科技新報）、股癌 EP、游庭皓 | 加 **LLM 摘要 + 自動關聯供應鏈標籤** |
| 三大法人買賣超 | 外資/投信/自營商 買進/賣出/買賣超 | 同，加趨勢副圖 |
| 資券變化 | 融資/融券餘額 | 同 |
| 本週強勢股 | 個股+題材標籤+漲幅 | 同，加篩選 |
| 大戶加碼股 | 400 張以上持股變動（集保週資料） | 同，加門檻滑桿 |
| 主動式 ETF 追蹤 | 每日持股變動（新增/加碼/減碼/移出）+ 跨 ETF 聚合 | 同 + **訊號提醒** |
| 重大資訊觀測站 | MOPS 公告 | 同 + LLM 風險分類 |
| 市場熱力圖 | 付費解鎖 | 免費基礎版（ECharts treemap） |
| 個股頁 | 本益比河流圖、法人副圖、大戶持股、布林通道、財務分析 tab、EPS/營收標籤 | 全做 + **LLM 對話問答** |
| 登入 / 付費牆 | PAYUNi 統一金流 | Stripe + 綠界/PAYUNi 雙軌 |
| AI 分析 | 模板化填空 | **RAG 檢索 + 對話式真分析** |

對手 SLA（更新頻率，可作為我方目標）：
- 產業焦點 每日 12:00 · 三大法人 平日 17:00 · ETF 持股 每日 16:00/17:55/20:30
- 重大資訊 每日 19:00 · 集保大戶 每週六 09:00

---

## 2. 技術架構

### 2.1 最終技術棧

| 層 | 技術 | 理由 |
|---|---|---|
| 前端框架 | Next.js 15 (App Router) + React 19 + TS | ISR/SSR 兼顧 SEO 與即時；已驗證可跑 |
| 樣式 / 元件 | Tailwind CSS v4 + **shadcn/ui**（主元件庫） | 漂亮、一致、可維護；當前頁面裸 Tailwind，Phase 1 起遷移 shadcn 基礎元件（Button/Card/Dialog/Sheet/Tabs） |
| 供應鏈圖 | React Flow (@xyflow/react v12) | 可控、客製美觀、手機 pan/zoom（POC 已通過）；超大規模(>2000 節點)備案用 **D3.js / visx** 力導向 |
| 財經圖表 | ECharts（熱力圖/treemap/K線/河流圖）+ 可選 Lightweight Charts | 一統圖表需求；極客製視覺用 visx |
| 狀態 | Zustand | 輕量夠用 |
| 資料請求 | TanStack Query | 輪詢/快取即時報價 |
| BFF | Next Route Handlers | 同倉庫，省部署 |
| 資料庫 | Supabase Postgres + pgvector | Auth/RLS/Realtime/Storage/Vector 一條龍 |
| 快取 | Upstash Redis (serverless) | 報價快取、rate limit，按用量計費 |
| Auth | Supabase Auth | Email / Google / Line OAuth |
| 付費 | Stripe（國際）+ 綠界 ECPay / PAYUNi（台灣） | 雙軌覆蓋 |
| ETL | Python 3.12 + httpx + pandas + SQLAlchemy | 爬蟲/清洗生態成熟 |
| LLM | Claude / GPT-4o | 新聞摘要、個股分析、問答 |
| 部署 | Vercel（前端+API）+ Supabase + Railway/Fly/Modal（ETL） | 全託管 |
| 監控 | Sentry + UptimeRobot | 錯誤與可用性 |

### 2.2 架構圖

```
前端 (Next.js/Vercel)
  ├─ React Flow 供應鏈圖
  ├─ ECharts 熱力圖/K線
  ├─ TanStack Query 即時輪詢
  └─ Zustand 狀態
        │
        ▼
BFF (Next Route Handlers)
  ├─ Supabase Auth 中介 → RLS
  ├─ Upstash Redis 快取層
  └─ 免費/Premium 欄位遮罩
        │
        ▼
資料層 (Supabase)
  ├─ Postgres（行情/法人/ETF/題材）
  ├─ pgvector（語意搜尋）
  ├─ Realtime（報價推送）
  └─ Storage（靜態/圖表快取）
        ▲
        │ ETL 寫入
ETL (Python, Railway/Modal, cron)
  └─ 證交所/櫃買/MOPS/集保/ETF/美股/日股/新聞 → 清洗 → LLM → upsert
```

---

## 3. 資料來源建議

| 資料 | 來源 | 頻率 | 合規注意 |
|---|---|---|---|
| 台股即時/日線 | 證交所 OpenAPI `openapi.twse.com.tw` | 盤中/日 | 公開；商業化前確認授權，必要時改 Fugle/SinoPac |
| 三大法人 | 證交所 BSI 接口 | 日 17:00 | 同上 |
| 資券 | 證交所信用交易 | 日 | 同上 |
| 財報 | 公開資訊觀測站 MOPS API | 季/年 | 公開 |
| 重大公告 | MOPS 即時公告 | 日 19:00 | 公開 |
| 集保大戶 | 台灣集中保管結算所 | 週六 09:00 | 公開資料 |
| ETF 持股 | 各投信公開月/日報 | 日 | 公開 |
| 美股 | FMP / Alpha Vantage / yfinance | 日 | FMP 有免費層 |
| 日股 | Yahoo Finance JP / Nikkei | 日 | 注意 robots |
| 新聞 | 中央社/經濟日報/鉅亨 RSS | 日 12:00 | 遵守 robots，附原文連結 |

**LLM 用途（控成本）**：僅對每日焦點新聞做摘要、個股分析 tab 按需生成、題材描述初稿。快取避免重算。

---

## 4. 資料庫 Schema（核心表）

```sql
market(id, code)                         -- tw/us/jp
stock(id, symbol, market_id, name, industry_id, market_cap, price, change_pct, updated_at)
theme(id, market_id, slug, title, description, verified_at, company_count)
theme_stock(theme_id, stock_id)         -- 多對多
supply_edge(from_stock_id, to_stock_id, relation)  -- 上下游/競爭
stock_daily(stock_id, date, o, h, l, c, volume, change_pct)
institutional(stock_id, date, foreign_net, invest_net, dealer_net, margin_balance, short_balance)
major_holder(stock_id, week, hold_pct, change_shares)
etf(id, code, name)
etf_holding(etf_id, stock_id, date, action)   -- add/increase/decrease/remove
news(id, source, title, url, published_at, summary, theme_tags)
mops_announcement(stock_id, date, type, title)
ai_analysis(stock_id, theme_id, content, model, created_at)
ai_embedding(stock_id, embedding vector(1536))   -- pgvector
profiles(id, email, plan, subscribed_until)
```
索引：`stock(symbol, market_id)`、`(theme_id)`、`(date)` 視窗查詢；pgvector 做相似個股推薦。

---

## 5. 開發階段與交付物

### Phase 0 — MVP 骨架 + 互動地圖 ✅（已完成）
**交付物**：可跑 Next.js 專案、React Flow 供應鏈示意圖、6 題材列表、個股/登入/定價頁、Docker、單元測試、git。
**狀態**：build 通過、瀏覽器實測地圖互動正常。

### Phase 1 — 個股頁閉環 + 佈局優化（建議下一階段）
**目標**：地圖互動 100% 覆蓋、視覺達生產級。
**交付物**：
- 個股頁 `subgraphFor([symbol])` 上下游子圖（取代 placeholder）
- dagre 自動佈局，解決節點過密
- 曲線邊 + 關係標籤（上游/下游/競爭）
- 手機端 React Flow 手勢優化（雙指縮放、底部 sheet）
**驗收**：手機 + 桌面皆可流暢拖動/縮放/點擊高亮；build + 實測通過。

### Phase 2 — 資料管線（接真資料）
**目標**：產品從「示意」變「活」。
**交付物**：
- Supabase schema 建表 + 環境變數接入（替換 mock）
- 證交所/櫃買 ETL：即時報價、日線、法人
- MOPS 財報 + 重大公告爬蟲
- 集保大戶 + 主動式 ETF 持股
- 20→全市場題材擴充
**驗收**：首頁漲跌數字與官方一致；cron 每日自動更新；錯誤處理 + 重試。

### Phase 3 — 視覺化與首頁完整化
**交付物**：熱力圖 treemap、強勢股排行（含篩選）、每日焦點（新聞+股癌）、市場指數卡、市場切換（美/日）。
**驗收**：首頁資訊密度對標 aistockmap；手機排版通過。

### Phase 4 — AI 與付費
**交付物**：
- 新聞 LLM 摘要 + 題材自動標籤
- 個股分析頁（多空論點 + 風險 + 引用來源）
- 對話式問答（RAG 檢索 DB + 新聞）
- pgvector 相似個股推薦
- Supabase Auth + Stripe + 綠界 付費牆 + RLS 欄位遮罩
**驗收**：Free/Premium 欄位隔離正確；AI 回答附來源；成本可控。

### Phase 5 — 增長與運維
**交付物**：開放資料 API（養生態）、個股/ETF 訊號提醒、SEO + 內容行銷、Sentry 監控、效能優化。
**驗收**：P75 載入 < 1.5s；可用性 99.9%。

---

## 6. SEO 與效能策略（優先級高）

### 6.1 SEO
- **SSR/ISR**：首頁、題材列表、個股頁用 `generateStaticParams` + `revalidate` 預渲染，兼顧即時與收錄
- **Metadata API**：每頁 `title` / `description` / `openGraph`，個股頁動態 metadata（公司名+產業+漲跌）
- **結構化資料**：個股頁加 JSON-LD（FinancialProduct / Organization），利於 Google 富結果
- **Sitemap / robots.txt**：自動產生，提交 Search Console
- **語系**：`lang="zh-Hant"`，URL 語意化（`/themes/ic-design-asic`、`/stock/2330`）
- **OG 圖**：動態 OG 圖（個股卡含股價），分享吸睛

### 6.2 效能
- **核心指標**：LCP < 2.5s、CLS < 0.1、INP < 200ms；目標 P75 載入 < 1.5s
- **地圖效能**：React Flow 節點 > 200 用虛擬化；`ssr:false` 動態載入避免阻塞首屏；`fitView` 預計算
- **圖片/字型**：next/font 自託管、圖片 lazy + AVIF/WebP
- **資料**：Supabase 查詢加索引；熱資料走 Upstash Redis（報價 15s TTL）；TanStack Query 去重輪詢
- **Bundle**：Route-level code splitting；ECharts/React Flow 按需 import；監控 bundle 大小
- **監控**：Vercel Analytics + Sentry；Lighthouse CI 進 PR

---

## 7. 風險與合規

- **資料授權**：證交所/MOPS 公開資料可用於非直接轉售；商業化前確認授權（可改 Fugle/SinoPac 合規源）。
- **金融警示**：網站加「非投資建議」免責聲明。
- **LLM 幻覺**：AI 分析須附引用來源、標註「AI 生成」。
- **爬蟲禮貌**：加延遲/User-Agent/robots 遵守，避免被封。
- **成本**：初期月成本可壓 $30–100（Vercel + Supabase + Railway + Upstash + LLM）。

---

## 8. 下一步建議
立即執行 **Phase 1**（個股頁閉環 + dagre 佈局優化），預估 1 次 session 內完成，風險低、立即提升產品完整度。
確認後我再開工，並於每個子任務後以真實 build/瀏覽器結果驗收。

---
*本規劃為 v1.1，隨開發迭代更新。*
