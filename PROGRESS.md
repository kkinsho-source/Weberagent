# 進度

## A/B/C 優化（本輪）

### A 防 bug
- A1 核心股 SSOT：`lib/data/core_universe.json`（TS mock + Python ETL）
- A2 財報 6h 快取 + fetch timeout
- A3 地圖 layout 使用傳入 edges（不再硬吃 mock）
- A4 Header 手機選單 + 搜尋

### B 品質
- B1 首頁移除 Demo 面板
- B2 Footer 文案改「公開資料」
- B3 個股面板 ErrorBoundary
- B4 `/status` ETL 健康頁

### C 體驗
- C1 全站股票搜尋
- C2 題材公司表可排序/篩選
- C3 季 EPS：FinMind 多季 + OpenAPI 備援
- C4 地圖節點依題材配色

### 工程
- GitHub Actions CI：`npm run build`

## 線上
- https://weberagent.vercel.app
- 狀態：/status
