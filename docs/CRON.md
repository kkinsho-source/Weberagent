# 定時 ETL 排程（每日收盤後 TWSE → Supabase）

## 推薦方案：Vercel Cron

| 方案 | 優點 | 缺點 |
|------|------|------|
| **Vercel Cron（採用）** | 與 Next.js 同部署、零額外部件、CRON_SECRET 內建支援 | Hobby 每日 cron 次數有限 |
| Supabase Edge + pg_cron | 排程在 DB 側 | Edge 抓外部 API / 密鑰管理較麻煩；仍建議只觸發 HTTP |
| GitHub Actions | 可跑 Python 腳本 | 需 remote + secrets；與網站部署分離 |

**結論：Vercel Cron 最合適。** 已內建；GitHub Actions 作備選。

---

## 已實作內容

| 項目 | 位置 |
|------|------|
| 排程 | `vercel.json` |
| API | `GET/POST /api/cron/twse-daily` |
| TWSE 抓取 | `lib/etl/twse.ts` |
| 重試 | `lib/etl/retry.ts`（指數退避，最多 3 次） |
| 寫入 | `upsertStockData` → `stocks` + `stock_prices` |
| 日誌 | `etl_logs`（started / success / failed） |
| 文件 | 本檔 `docs/CRON.md` |
| 備選 | `.github/workflows/twse-daily.yml` |

### 排程時間（台灣）
- **17:30** 平日：`30 9 * * 1-5`（UTC）— 主跑
- 程式內 **fetch / upsert 各重試 3 次**（指數退避）；若資料常晚到，可在 `vercel.json` 加第二條 `0 10 * * 1-5`（18:00 台灣）

### 執行流程
```
Vercel Cron
  → /api/cron/twse-daily
  → fetch TWSE STOCK_DAY_ALL（重試 3 次）
  → upsert stocks + stock_prices（重試 3 次）
  → etl_logs success/failed
```

---

## Vercel 設定步驟

### 1. 推上 GitHub 並 Import 到 Vercel
```bash
git remote add origin https://github.com/<you>/aistockmap.git
git push -u origin master
```
Vercel → Add New Project → 選該 repo → Deploy

### 2. Environment Variables
**Project → Settings → Environment Variables**（Production / Preview）：

| Name | 必填 | 說明 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 寫入用，勿公開 |
| `CRON_SECRET` | ✅ Production | 長隨機字串，保護端點 |
| `DATA_MODE` | 建議 `auto` | |

產生 secret 範例：
```bash
openssl rand -hex 32
```

### 3. 確認 Cron Jobs
部署後：**Project → Settings → Cron Jobs**  
應看到兩條指向 `/api/cron/twse-daily` 的排程。

> Vercel 觸發時會自動帶 `Authorization: Bearer <CRON_SECRET>`。  
> 請確保專案 env 的 `CRON_SECRET` 與 Vercel 使用的一致（多數專案自行設定同名變數即可）。

### 4. Hobby 注意
- Hobby 通常限制 cron 頻率；兩條平日排程請確認方案額度
- 若額度不夠，可刪掉 18:00 那條，只留 17:30

---

## 手動測試

### 本機（未設 CRON_SECRET 時僅 localhost）
```bash
cd /d/weberanent/aistockmap-project
npm run build
PORT=3114 npm run start

# 乾跑：只抓 TWSE 不寫 DB
curl -s "http://localhost:3114/api/cron/twse-daily?dryRun=1" | python -m json.tool

# 正式寫入
curl -s "http://localhost:3114/api/cron/twse-daily" | python -m json.tool

# 查日誌
curl -s "http://localhost:3114/api/etl-logs?limit=5" | python -m json.tool
```

### 已設 CRON_SECRET
```bash
curl -s "http://localhost:3114/api/cron/twse-daily" \
  -H "Authorization: Bearer $CRON_SECRET" | python -m json.tool
```

### Production 手動觸發
```bash
curl -s -X POST "https://YOUR_DOMAIN/api/cron/twse-daily" \
  -H "Authorization: Bearer $CRON_SECRET" | python -m json.tool
```

### npm 捷徑
```bash
npm run cron:twse        # 本機觸發（需 dev/start 已開）
npm run cron:twse:dry    # dryRun
```

成功 JSON：
```json
{
  "ok": true,
  "asOf": "2026-07-09",
  "marketCount": 1369,
  "stocks": 18,
  "prices": 18,
  "coreOnly": true,
  "ms": 472
}
```

`etl_logs` 應見：
- `job_name=twse_daily_cron`
- `status=success`
- `records_count=18`
- `message` 含 asOf / ms

---

## 備選：GitHub Actions

1. Push repo 後，Settings → Secrets 加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Actions → `twse-daily-etl` → Run workflow  
3. 排程同為平日 17:30 台灣時間

---

## 可選：Supabase pg_cron 只負責「觸發」

```sql
-- 啟用 extensions: pg_cron, pg_net
select cron.schedule(
  'twse-daily-via-vercel',
  '30 9 * * 1-5',
  $$
  select net.http_post(
    url := 'https://YOUR_DOMAIN/api/cron/twse-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```
ETL 本體仍在 Vercel API（可出網抓 TWSE）。

---

## 狀態檢查清單

- [x] API Route `/api/cron/twse-daily`
- [x] `vercel.json` 17:30 + 18:00 台灣時間（平日）
- [x] 重試（fetch + upsert）
- [x] etl_logs started/success/failed
- [x] 手動 dryRun / 正式觸發
- [x] 本機實測曾成功寫入 Supabase
- [ ] 部署 Vercel 後 Dashboard 可見 Cron Jobs
- [ ] Production 設好 `CRON_SECRET` + service role
