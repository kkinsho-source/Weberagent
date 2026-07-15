# 進度

## 最新完成
- **A** Supabase `themes_and_edges.sql` 已執行成功
- **B** production 個股頁走勢/供應鏈/財報/AI 驗證通過
- **C** 核心股 35、題材 8、供應鏈邊 50；ETL 已 push 35 stocks / 29 prices

## 線上驗證
- `/api/v1/health/supabase` → stocksCount=35
- `/api/stocks` → dataSource=supabase, count=35
- 8 個 themeSlug 齊全（含 thermal_power / optical_cpo）

## 備註
- 少數櫃買/缺報價檔可能 price 仍空（TWSE STOCK_DAY_ALL 未含）— 可後續接 OTC
- Cron 平日 17:30 台灣會持續更新

## 線上
- https://weberagent.vercel.app
