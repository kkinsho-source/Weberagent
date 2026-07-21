# S1–S4 Theme tier / family / scope / Tier-0 / Supabase

## S4 產物
- `supabase/expand_tier0_s4.sql`（**可重跑**）
  - A. `themes` 加 `tier` / `family` / `radar_default`
  - B. upsert **23** themes
  - C. upsert **106** stocks（theme_slug 對齊；不蓋非零價）
  - D. 抽查 select
- 產生器：`scripts/etl/gen_expand_tier0_s4.py`
- `themes_and_edges.sql` create table 已含新欄（新環境）

## 你要手動做的（SQL Editor）
1. Supabase → SQL Editor → 貼上 **expand_tier0_s4.sql 全文** → Run
2. 確認抽查：`tier0_themes = 12`、`stock_count >= 106`
3. 本地 ETL 補價：
   ```bash
   npm run etl:twse
   npm run etl:push
   ```
   （`push --core-only` 會讀完整 core_universe 106 檔）
4. 驗證 prod：`/api/stocks` count、`/api/themes?scope=tier0` = 12

## 注意
- service_role **不能**代跑任意 DDL → 必須 SQL Editor
- 聊天交付以 **完整 SQL** 為準（見該次對話或 repo 檔）
