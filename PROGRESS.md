# 階段性進度總結

## 已完成
- [x] Next.js 15 + React Flow 地圖 + TWSE 行情 ETL
- [x] Supabase schema / clients / Auth / favorites
- [x] **MOPS 重大訊息爬蟲 + API + 前端**
  - OpenAPI `t187ap04_L` 日更（含全文說明）
  - mopsov `ajax_t05st01` 公司年度列表
  - snapshot 357 筆（2330/2317/2454 + 日更）
  - `mops_announcements` 表 SQL
  - `/api/v1/mops`、`/announcements`、首頁區塊、個股 Tab

## 待你操作
- [ ] Supabase 執行 `supabase/mops_announcements.sql`（或完整 schema.sql）
- [ ] 填 `.env.local` 後 `npm run etl:mops:push`
- [ ] GitHub remote + push

## 建議下一階段
1. 個股財報（OpenAPI t187ap14 已可取）
2. 定時 cron（GitHub Actions / Vercel cron）跑 ETL
3. AI 摘要重大訊息標籤
