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

## 下一步（Phase 1）
- [ ] Supabase 建表 + 環境變數接入（替換 mock）
- [ ] 證交所/櫃買 ETL：即時報價、日線、法人
- [ ] MOPS 財報 + 重大公告爬蟲
- [ ] 集保大戶 + 主動式 ETF 持股
- [ ] 個股頁接 React Flow 上下游子圖（目前用 placeholder）

## 環境約束
- 所有檔案存於 D:\weberanent\（C 槽不放專案檔）
