# Supabase 完整整合設定指南

## 一、建立專案（約 5 分鐘）

1. 開啟 https://supabase.com → **New Project**
2. 填寫名稱（例：`aistockmap`）、資料庫密碼、區域（建議 **Northeast Asia / Tokyo** 或 Singapore）
3. 等待專案就緒

## 二、取得 API Keys

**Project Settings → API**

| 名稱 | 環境變數 | 可否公開 |
|------|----------|----------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | 可 |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 可 |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` | **否** |

## 三、執行 Schema

SQL Editor 依序執行（或只跑最新完整檔）：

1. **推薦**：`supabase/core_tables.sql`  
   （stocks / stock_prices / etl_logs / mops_announcements + 20 檔種子）
2. 若需要 Auth / favorites / themes 全功能：再跑 `supabase/schema.sql`  
   （profiles、favorites、themes、supply_edges…）
3. 若 schema 已跑過舊版，可單獨補：`supabase/mops_announcements.sql`

## 四、本機環境變數

```bash
cp .env.example .env.local
# 編輯填入三個 key
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATA_MODE=auto
```

重啟 dev server 後環境變數才會生效。

## 五、寫入真實行情

```bash
# 1) 抓證交所
npm run etl:twse

# 2a) Python 推送（stocks 最新價）
npm run etl:push

# 2b) 或經由 Next API（stocks + stock_prices）
# 需先 npm run build && npm run start
curl -X POST http://localhost:3110/api/admin/migrate-snapshot \
  -H "Content-Type: application/json" \
  -d "{\"coreOnly\":true}"
```

## 六、驗證

```bash
curl http://localhost:3110/api/v1/health/supabase   # ok:true
curl http://localhost:3110/api/stocks               # dataSource:supabase
curl http://localhost:3110/api/prices/2330
curl http://localhost:3110/api/etl-logs
```

## 七、Vercel 環境變數

**Project → Settings → Environment Variables**

| Name | Environments |
|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | Production（+ Preview 若需 migrate） |
| `DATA_MODE` | `auto` |
| `MIGRATE_SECRET` | 建議設定，保護 migrate API |

> 勿把 `SERVICE_ROLE` 加 `NEXT_PUBLIC_` 前綴。

## 八、Auth（可選）

- Authentication → Providers → Email 開啟
- 開發可關閉 Confirm email
- Redirect URL：`http://localhost:3100/auth/callback`

## 九、程式入口

```
lib/supabase.ts          # 統一 re-export
lib/supabase/client.ts   # 瀏覽器
lib/supabase/server.ts   # RSC / Route Handler (anon)
lib/supabase/admin.ts    # service_role
lib/data/upsert.ts       # upsertStockData
lib/data/migrate.ts      # migrateSnapshotToSupabase
lib/data/source.ts       # auto: supabase → snapshot → mock
```
