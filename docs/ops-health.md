# 營運健檢備忘（C）

最後自動核對時間：以 prod curl 為準。

## Prod 檢查結果（本次）

| 項目 | 結果 |
|------|------|
| `/api/stocks` | 200 · count **106** · dataSource=supabase · asOf **2026-07-29** · quoteSource=stock_prices |
| `/api/theme-flow?scope=all` | 200 · **23** 題 · dayCount **28** · 法人 snapshot+DB |
| `/api/etl-logs` | 200 · `twse_daily_cron` **success** · stocks=106 prices=106 inst=106 mops=180 |
| `institutional_daily_cron` | success · upserted 106 · asOf=2026-07-29 |
| `/api/v1/health/supabase` | ok · service role 就緒 |

## 排程

- `vercel.json`：`30 9 * * 1-5` UTC → 台灣平日 **17:30**
- 路徑：`/api/cron/twse-daily`（價 + OTC + MOPS + 法人）

## 若某日資料未更新

1. 確認 Vercel Production 有 `CRON_SECRET`、`SUPABASE_SERVICE_ROLE_KEY`
2. 手動：`curl -H "Authorization: Bearer $CRON_SECRET" https://weberagent.vercel.app/api/cron/twse-daily`
3. 看 `/api/etl-logs` 最新 status / message
4. 本地可 `npm run etl:inst` + `npm run etl:inst:push` 回填法人

## 備註

- asOf 停在交易日屬正常（假日／尚未跑 cron）
- 本檔不放任何 secret
