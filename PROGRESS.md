# 進度

## 最新完成（本輪 A+B+C）
- **B 驗證** production 個股頁（2330）：走勢 / 供應鏈 / 財務分析 / AI 分析 皆正常、無 JS error
- **C 擴充**：核心股池 20 → **35**；題材 6 → **8**（+散熱電源、光通訊/CPO）；供應鏈邊 17 → **~50**（含競品）
- SQL / mock / ETL 核心清單已對齊

## 待你操作（A）
1. Supabase SQL Editor 執行 `supabase/themes_and_edges.sql`（建 themes/supply_edges + seed + 補 theme_slug）
2. 部署後（或本地）可選：`npm run etl:all` 或等 cron 補報價
3. 驗證：`/api/stocks` count≈35；首頁地圖出現新題材節點

## 線上
- https://weberagent.vercel.app
- Cron：平日 17:30 台灣

## 備註
- 財報 API 目前證交所 OpenAPI 多半只回「最新一筆」月營收/季 EPS（非 bug）
- 股價欄位 0 的 seed 會被後續 ETL 覆蓋
