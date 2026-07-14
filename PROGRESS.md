# 進度

## 最新完成（f860c02 之後）
- 財報 API + 面板（月營收 t187ap05、季 EPS t187ap14）
- 規則式 AI 洞察 API + 面板
- K 線歷史預熱：核心 20 檔 **2103** 根日線寫入 stock_prices
- Production cron 驗證：stocks=20 otc=2 mops=117
- themes/supply_edges：SQL 就緒 `supabase/themes_and_edges.sql`（需手動跑一次）

## 待你操作
1. Supabase SQL Editor 執行 `supabase/themes_and_edges.sql`
2. 然後可選：`PUT /api/admin/warmup-prices` 再 seed（或 SQL 已含 seed）
3. 等 Vercel 部署本 commit 後驗財務/AI 分頁

## 線上
- https://weberagent.vercel.app
- Cron：平日 17:30 台灣
