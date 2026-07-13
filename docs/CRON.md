# 定時 ETL 排程（每日收盤後 TWSE → Supabase）

## 方案選擇

| 方案 | 適用 | 優點 |
|------|------|------|
| **A. Vercel Cron（推薦）** | 已/將部署 Vercel | 與 Next 同倉、serverless 直接抓 TWSE 寫 DB |
| **B. GitHub Actions（備選）** | 有 GitHub remote | 跑現成 Python 腳本，不依賴 Vercel 方案 |

兩者都寫 `etl_logs`，可並存或擇一。

---

## A. Vercel Cron（已內建）

### 排程
- 檔案：`vercel.json`
- 路徑：`GET/POST /api/cron/twse-daily`
- 時間：`30 9 * * 1-5`（**UTC**）= 台灣時間 **週一～五 17:30**
- 邏輯：抓證交所 OpenAPI → `upsert stocks` + `stock_prices` → `etl_logs`

### 環境變數（Vercel Project Settings）

| Name | 說明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **必填**，寫入用 |
| `CRON_SECRET` | **必填（Production）**，保護 cron 端點 |
| `DATA_MODE` | `auto` |

Vercel 觸發 cron 時會帶：
```http
Authorization: Bearer <CRON_SECRET>
```
請把 Vercel 的 Cron Secret 與專案 `CRON_SECRET` 設成**相同值**  
（Vercel Dashboard → Project → Settings → Environment Variables；  
  新版也可能在 Cron Jobs 設定自動注入 `CRON_SECRET`）。

### 部署後生效
1. `git push` 到連 Vercel 的 repo
2. Production 部署完成後，Cron 出現在 **Project → Settings → Cron Jobs**
3. Hobby 方案通常每天 1 次額度；本 job 平日一次足夠

### 本機 / 手動測試

```bash
# 1) .env.local 需有 SERVICE_ROLE（本機未設 CRON_SECRET 時僅允許 localhost）
cd /d/weberanent/aistockmap-project
PORT=3113 npm run build && PORT=3113 npm run start

# 2) 觸發
curl -s "http://localhost:3113/api/cron/twse-daily" | python -m json.tool

# 3) 若已設 CRON_SECRET
curl -s "http://localhost:3113/api/cron/twse-daily" \
  -H "Authorization: Bearer $CRON_SECRET" | python -m json.tool

# 4) 查 etl_logs
curl -s "http://localhost:3113/api/etl-logs" | python -m json.tool
```

成功回應範例：
```json
{
  "ok": true,
  "asOf": "2026-07-09",
  "marketCount": 1369,
  "stocks": 18,
  "prices": 18,
  "coreOnly": true,
  "ms": 1234
}
```

全市場（較慢、較大 payload）：
```bash
curl -s "http://localhost:3113/api/cron/twse-daily?coreOnly=0" \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## B. GitHub Actions（備選）

檔案：`.github/workflows/twse-daily.yml`  
排程：同樣 `30 9 * * 1-5`（UTC）= 台灣 17:30 平日

### Secrets（Repo → Settings → Secrets）
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 測試
- Actions → `twse-daily-etl` → **Run workflow**

---

## C. Supabase pg_cron（可選進階）

若希望排程跑在 Supabase 內：

1. Dashboard → **Database → Extensions** 啟用 `pg_cron`、`pg_net`
2. SQL（把 URL / service_role 換成你的；**不要**把 service_role 長期明文放 SQL，建議用 Vault）：

```sql
-- 範例：週一到五 09:30 UTC 打 Vercel cron 端點
select cron.schedule(
  'twse-daily-1730-tw',
  '30 9 * * 1-5',
  $$
  select net.http_post(
    url := 'https://YOUR_VERCEL_DOMAIN/api/cron/twse-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

仍建議 **實際 ETL 跑在 Vercel API**（可抓外部 TWSE），pg_cron 只負責觸發。

---

## 驗證 checklist

- [ ] `/api/etl-logs` 出現 `job_name=twse_daily_cron`、`status=success`
- [ ] `/api/stocks?symbol=2330` 的 `price` 有更新、`dataSource=supabase`
- [ ] `/api/prices/2330` 有當日 `trade_date` 列
- [ ] Vercel Cron Jobs 列表可見 ` /api/cron/twse-daily`

## 注意

- 證交所日資料有時在 17:30 後才齊；若偶發空資料，可改 `0 10 * * 1-5`（台灣 18:00）
- 假日仍會跑但可能重複寫同一天（upsert 冪等，安全）
- `maxDuration=60`；核心 20 檔足夠；全市場請在 Pro 提高 timeout
