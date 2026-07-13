# 階段性進度總結 (2026-07-13)

## 已完成
- [x] 技術架構計劃書 PLAN.md（對標 aistockmap 14 章）
- [x] Next.js 15 + TS + Tailwind 專案骨架，production build 通過
- [x] 頁面：首頁 / 題材列表 / 題材詳情 / 個股頁 / 登入 / 定價
- [x] UI 元件：StockCard / ThemeCard / MapPlaceholder / MarketTabs
- [x] 真實台股 mock 資料（20 檔 + 6 題材 + 供應鏈）
- [x] **React Flow 互動式供應鏈地圖**（首頁全圖 + 題材頁子圖），點擊高亮上下游
- [x] 測試：graph.test.ts（20 nodes / 17 edges 驗證）
- [x] Dockerfile + docker-compose + .dockerignore（DevOps）
- [x] README.md

## 下一步（Phase 2 → 待辦）
- [x] 單一資料縫合層 `lib/data/source.ts`（mock / snapshot / supabase 三模式）
- [x] 真實 ETL `scripts/etl/twse_daily.py`（證交所 STOCK_DAY_ALL，實跑抓 1369 檔）
- [x] `twse_snapshot.json` 真實報價（asOf 2026-07-09）
- [x] BFF 路由 `app/api/v1/stocks`（全部/單檔/題材）
- [x] Supabase `schema.sql`（14 表 + RLS + 從 mock 種子）
- [ ] 接上 Supabase 憑證後：ETL 改 upsert 進 DB、source.ts 切 supabase 模式
- [ ] MOPS 財報 + 重大公告爬蟲
- [ ] 集保大戶 + 主動式 ETF 持股
- [ ] 個股即時輪詢（TanStack Query）→ 報價 15s TTL 快取

## 環境約束
- 所有檔案存於 D:\weberanent\（C 槽不放專案檔）
