-- 增量：材料 / HBM 題材 + 股池 + 邊（可重跑）
-- 前提：已執行 themes_and_edges.sql

insert into public.themes (market, slug, title, description, verified_at, company_count) values
  ('tw','materials_wafer','矽晶圓與半導體材料','12 吋矽晶圓、磊晶與關鍵半導體材料。','2026-07-16',3),
  ('tw','memory_hbm','記憶體 / HBM 相關','DRAM/NAND 與控制器，承接 AI 記憶體頻寬需求。','2026-07-16',4)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  verified_at = excluded.verified_at,
  company_count = excluded.company_count;

insert into public.supply_edges (from_symbol, to_symbol, relation, market)
values
  ('6488','2330','downstream','tw'),
  ('6488','2303','downstream','tw'),
  ('3532','2330','downstream','tw'),
  ('6182','2303','downstream','tw'),
  ('6182','6770','downstream','tw'),
  ('2344','3711','downstream','tw'),
  ('2408','3711','downstream','tw'),
  ('2337','3711','downstream','tw'),
  ('8299','2317','downstream','tw'),
  ('8299','6669','downstream','tw'),
  ('2408','6669','downstream','tw'),
  ('6488','3532','competitor','tw'),
  ('2344','2408','competitor','tw')
on conflict (from_symbol, to_symbol, relation, market) do nothing;

insert into public.stocks (symbol, market, name, industry, theme_slug, price, change_pct, market_cap)
values
  ('6488','tw','環球晶','矽晶圓','materials_wafer',0,0,2000),
  ('3532','tw','台勝科','矽晶圓','materials_wafer',0,0,700),
  ('6182','tw','合晶','矽晶圓','materials_wafer',0,0,250),
  ('2344','tw','華邦電','記憶體','memory_hbm',0,0,1400),
  ('2408','tw','南亞科','記憶體','memory_hbm',0,0,2200),
  ('2337','tw','旺宏','記憶體','memory_hbm',0,0,500),
  ('8299','tw','群聯','控制器','memory_hbm',0,0,1100)
on conflict (symbol, market) do update set
  name = excluded.name,
  industry = excluded.industry,
  theme_slug = excluded.theme_slug,
  market_cap = coalesce(nullif(public.stocks.market_cap, 0), excluded.market_cap);
