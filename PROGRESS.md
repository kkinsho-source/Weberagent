# 階段性進度總結

## 已完成
- [x] Next.js 15 + TS + Tailwind 專案骨架，production build 通過
- [x] 頁面：首頁 / 題材列表 / 題材詳情 / 個股頁 / 登入 / 定價
- [x] React Flow 互動式供應鏈地圖 + dagre
- [x] 真實 TWSE ETL + snapshot
- [x] **Supabase 整合骨架**
  - schema.sql：profiles / stocks / watchlists / favorites / etl_logs / themes / supply_edges
  - client / server / admin 三層 client
  - source.ts auto：supabase → snapshot → mock
  - API：`/api/v1/stocks`、`/etl-logs`、`/health/supabase`
  - ETL push：`scripts/etl/push_to_supabase.py`（dry-run 已驗證 payload）
  - 首頁示範元件 `SupabaseDataDemo`

## 待你操作（需憑證）
- [ ] 建立 Supabase 專案 + 執行 schema.sql
- [ ] 填 `.env.local` 三個 key
- [ ] `npm run etl:all` 寫入真實行情
- [ ] 設定 GitHub remote 後 push
- [ ] Vercel 環境變數

## 建議下一階段
1. **你填憑證後**：我幫你驗證 health + push + dataSource=supabase
2. 或 **MOPS 爬蟲**（財報/重大公告）並行推進內容

## 環境約束
- 所有檔案存於 D:\weberanent\
