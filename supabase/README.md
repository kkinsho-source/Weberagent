# Supabase 接入說明（Phase 2）

## 1. 建立專案
1. 前往 https://supabase.com → New Project
2. 記下 Project URL 與 anon key（Project Settings → API）

## 2. 執行 Schema
- Supabase Studio → SQL Editor → 貼上 `supabase/schema.sql` → Run
- 此檔會建立 14 張表 + RLS 策略 + 從 `lib/data/mock.ts` 灌入 6 題材 / 20 個股 / 17 條供應鏈邊
- （可選）啟用 pgvector 擴充（schema 內已 `create extension if not exists vector`）

## 3. 設定環境變數
複製 `.env.example` → `.env.local` 並填入：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
啟用 Supabase 資料模式：在 `lib/data/source.ts` 把 `MODE` 來源改為 `'supabase'`（或在 runtime 設 `DATA_MODE=supabase`）。
> 目前 `source.ts` 預設走 `snapshot`（本地真實行情 JSON），未設環境變數時不會連 Supabase，避免 SSR 報錯。

## 4. 灌真實報價（ETL）
```bash
python3 scripts/etl/twse_daily.py
# 輸出 lib/data/twse_snapshot.json（asOf + 1369 檔收盤/漲跌）
```
上 Supabase 後，把 ETL 改為 upsert 進 `stock.price` / `stock.change_pct` / `stock_daily`：
```sql
update stock s set price = q.price, change_pct = q.change_pct, updated_at = now()
from jsonb_each_text(...) ...
```
（具體 upsert 腳本為 Phase 2 後半，待 Supabase 憑證確認後補齊。）

## 5. RLS 與付費（Phase 4 才啟用）
- `financials` / `major_holder` / `ai_analysis` 細節欄位：計畫以 `plan='premium'` 遮罩（API 層雙保險）。
- `profiles` 表由 Supabase Auth 註冊觸發器建立（見 PROJECT_PLAN §10）。
- 前端讀取一律走 anon key；寫入只走 service_role（ETL 後端，勿暴露到前端）。
