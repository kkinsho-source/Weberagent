# MOPS 重大訊息 ETL 說明

## 資料源

### A. 證交所 OpenAPI（官方、優先）
- **Endpoint**: `GET https://openapi.twse.com.tw/v1/opendata/t187ap04_L`
- **用途**: 上市公司每日重大訊息快照（含主旨 + 完整說明）
- **欄位**: 出表日期、發言日期、發言時間、公司代號、公司名稱、`主旨 `（注意尾空白）、符合條款、事實發生日、說明
- **注意**:
  - 官方 key 名稱「主旨 」後方有空白，解析時需相容
  - 日更資料量可能很少（當日/最近發言）；不是全年歷史
  - 上櫃 `t187ap04_O` 可能回 HTML 錯誤頁，目前不依賴

### B. MOPS 舊站 ajax（公司年度列表）
- **Endpoint**: `POST https://mopsov.twse.com.tw/mops/web/ajax_t05st01`
- **Referer**: `https://mopsov.twse.com.tw/mops/web/t05st01`
- **Payload 關鍵**: `TYPEK=sii`, `co_id`, `year`（民國年）, `isnew=false`
- **回傳**: HTML table（公司代號/名稱/發言日期/發言時間/主旨）— **通常無全文說明**
- **注意**:
  - `mops.twse.com.tw` 新站常回「安全性考量，無法呈現」
  - 請用 `mopsov.twse.com.tw`
  - 對核心股輪詢時加 delay（預設 0.8s），避免被擋
  - 遵守 robots / 合理頻率；商業化前確認授權

## 指令

```bash
# 每日全市場（OpenAPI）
npm run etl:mops

# 日更 + 核心 20 檔年度列表
npm run etl:mops:core

# 寫入 Supabase（需 SERVICE_ROLE + 已執行 mops_announcements.sql）
npm run etl:mops:push

# 單公司
python3 scripts/etl/mops_announcements.py --mode company --symbol 2330
```

Snapshot：`lib/data/mops_snapshot.json`（merge 去重，不互相覆蓋）

## API

`GET /api/v1/mops?symbol=2330&from=2026-01-01&to=2026-07-14&q=子公司&limit=50`

優先讀 Supabase `mops_announcements`，否則 snapshot。

## 前端

- `/announcements` 全站重大訊息
- 首頁 compact 區塊
- 個股頁 Tab「重大訊息」
