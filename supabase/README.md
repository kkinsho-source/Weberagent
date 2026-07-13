# Supabase 接入完整說明（Phase 2）

## 一、建立 Supabase 專案（約 5 分鐘）

1. 前往 https://supabase.com → **New Project**
2. 選組織、專案名稱（例：`aistockmap`）、資料庫密碼、區域（建議 `Northeast Asia (Tokyo)` 或新加坡）
3. 建立完成後進入 **Project Settings → API**，複製：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`（⚠️ 機密，只放 server）

## 二、執行 Schema

1. 開啟 **SQL Editor**
2. 貼上並執行專案內的 `supabase/schema.sql`
3. 成功後 Table Editor 應看到：
   - `profiles`（對應 Auth users）
   - `stocks` / `stock_daily`
   - `watchlists` / `favorites`
   - `etl_logs`
   - `themes` / `supply_edges`
4. Seed 已內建 20 檔個股 + 6 題材 + 17 條供應鏈邊（價格待 ETL 覆寫）

## 三、本機環境變數

```bash
cp .env.example .env.local
# 編輯 .env.local 填入三個 key
```

| 變數 | 用途 | 可否公開 |
|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | 專案 URL | 可（前端） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS 下的公開讀/登入 | 可（前端） |
| `SUPABASE_SERVICE_ROLE_KEY` | ETL 寫入、繞過 RLS | **否** |
| `DATA_MODE` | `auto` / `snapshot` / `supabase` / `mock` | 可 |

`.env.local` 已被 `.gitignore` 排除，**不要 commit**。

## 四、寫入真實行情

```bash
# 1) 抓證交所
python3 scripts/etl/twse_daily.py

# 2) dry-run 驗證 payload
python3 scripts/etl/push_to_supabase.py --dry-run

# 3) 推核心 20 檔到 Supabase
python3 scripts/etl/push_to_supabase.py --core-only

# 或全市場
python3 scripts/etl/push_to_supabase.py --all
```

成功後：
- `stocks.price` / `change_pct` / `as_of` 更新
- `etl_logs` 新增一筆 `status=success`

## 五、驗證

```bash
npm run dev   # 建議 PORT=3100
curl http://localhost:3100/api/v1/health/supabase
curl http://localhost:3100/api/v1/stocks?symbol=2330
curl http://localhost:3100/api/v1/etl-logs
```

健康檢查 `ok:true` 且 `dataSource:"supabase"` 即成功。

## 六、Vercel 部署設定

1. 推上 GitHub 後，Import 到 Vercel
2. **Project → Settings → Environment Variables** 新增（Production / Preview）：

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | 你的 URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | **僅 Production（與 Preview 若需跑 ETL）** |
| `DATA_MODE` | `auto` | 同上 |

3. Redeploy 後訪問 `/api/v1/health/supabase` 確認

> 注意：`SUPABASE_SERVICE_ROLE_KEY` 若設了會進 server runtime，**不要**加 `NEXT_PUBLIC_`。
> 前端 ETL 推送請用本機 / CI / cron worker，不要做公開 API 暴露 service role。

## 七、程式架構

```
lib/supabase/
  client.ts   # 瀏覽器（Auth 用）
  server.ts   # Route Handler / RSC（anon + RLS）
  admin.ts    # service role（僅 server）
  types.ts    # 表型別

lib/data/
  source.ts          # auto: supabase → snapshot → mock
  supabase-repo.ts   # 讀 stocks/themes/edges/etl_logs
  twse_snapshot.json  # 本地真實行情 fallback

app/api/v1/
  stocks/route.ts
  etl-logs/route.ts
  health/supabase/route.ts
```

## 九、Auth + 自選股（已實作）

### 啟用 Auth
1. Supabase Studio → **Authentication → Providers** → Email 開啟
2. （開發）可關閉 **Confirm email** 方便本機測試：Authentication → Providers → Email → Confirm email off
3. Authentication → URL Configuration：
   - Site URL: `http://localhost:3100`（或你的 dev port）
   - Redirect URLs 加：`http://localhost:3100/auth/callback`

### 使用流程
1. `/login` 註冊 / 登入
2. 個股頁點「☆ 收藏」→ 寫入 `favorites`（已登入）或本機 localStorage（未登入）
3. `/favorites` 查看自選
4. Header 顯示「自選 / 使用者 / 登出」

### API
- `GET/POST/DELETE /api/v1/favorites`（需 session cookie）
