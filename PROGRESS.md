# 進度

## 本輪全做完（手機 UX + 財報歷史 + 材料/HBM）

### 1) 手機地圖 UX
- 響應高度 `min(70vh)`、觸控 pinch/pan
- 手機隱藏 MiniMap、節點更緊湊
- 點選底部 action bar + 雙擊進個股
- Tabs 橫向滑動

### 2) 財報多月歷史
- MOPS `t21sc03` 歷史頁拉近 12 個月營收
- 圖表：營收 bar + 年增% line
- Production 驗證：2330 → **12 個月** `dataSource: MOPS monthly history + TWSE OpenAPI`

### 3) 供應鏈擴層
- 題材 10（+矽晶圓、記憶體/HBM）
- 核心股 **42**、邊 **63**
- REST seed + cron：`stocks=42 prices=42 otc=9`

## 線上
- https://weberagent.vercel.app
- commit: d0c853c
