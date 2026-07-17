-- 增量：U1 既有題材擴股 + T1a 半導體設備與測試（可重跑）
-- 前提：已執行 themes_and_edges.sql（及可選 expand_materials_hbm.sql）
-- 跑完後建議觸發日更 cron 或 warmup-prices 補價 / 歷史

insert into public.themes (market, slug, title, description, verified_at, company_count) values
  ('tw','semicon_equipment','半導體設備與測試','測試機、探針卡、晶圓盒／光罩盒與濕製程設備等，支援先進製程產能擴充與良率驗證。','2026-07-17',5)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  verified_at = excluded.verified_at,
  company_count = excluded.company_count;

-- 更新既有題材 company_count（示意）
update public.themes set company_count = 6, verified_at = '2026-07-17' where slug = 'ai_server';
update public.themes set company_count = 5, verified_at = '2026-07-17' where slug = 'ic_design_hpc';
update public.themes set company_count = 7, verified_at = '2026-07-17' where slug = 'advanced_packaging';
update public.themes set company_count = 7, verified_at = '2026-07-17' where slug = 'pcb_ccl';
update public.themes set company_count = 6, verified_at = '2026-07-17' where slug = 'thermal_power';
update public.themes set company_count = 6, verified_at = '2026-07-17' where slug = 'ic_design_asic';

insert into public.stocks (symbol, market, name, industry, theme_slug, price, change_pct, market_cap)
values
  ('2376','tw','技嘉','組裝','ai_server',0,0,1800),
  ('2324','tw','仁寶','組裝','ai_server',0,0,1600),
  ('3034','tw','聯詠','IC 設計','ic_design_hpc',0,0,4200),
  ('6415','tw','矽力*-KY','IC 設計','ic_design_hpc',0,0,2800),
  ('6239','tw','力成','封測','advanced_packaging',0,0,1500),
  ('3264','tw','欣銓','封測','advanced_packaging',0,0,450),
  ('2368','tw','金像電','PCB','pcb_ccl',0,0,1200),
  ('5469','tw','瀚宇博','PCB','pcb_ccl',0,0,350),
  ('2421','tw','建準','散熱','thermal_power',0,0,700),
  ('3529','tw','力旺','IP','ic_design_asic',0,0,900),
  ('2360','tw','致茂','測試設備','semicon_equipment',0,0,2200),
  ('3450','tw','聯鈞','測試設備','semicon_equipment',0,0,280),
  ('6510','tw','精測','測試設備','semicon_equipment',0,0,450),
  ('3680','tw','家登','設備耗材','semicon_equipment',0,0,700),
  ('3131','tw','弘塑','製程設備','semicon_equipment',0,0,320)
on conflict (symbol, market) do update set
  name = excluded.name,
  industry = excluded.industry,
  theme_slug = excluded.theme_slug,
  market_cap = coalesce(nullif(public.stocks.market_cap, 0), excluded.market_cap);

insert into public.supply_edges (from_symbol, to_symbol, relation, market)
values
  ('3034','2330','downstream','tw'),
  ('6415','2330','downstream','tw'),
  ('3529','3443','downstream','tw'),
  ('2330','6239','downstream','tw'),
  ('2330','3264','downstream','tw'),
  ('2303','6239','downstream','tw'),
  ('2368','2317','downstream','tw'),
  ('2368','2382','downstream','tw'),
  ('5469','2382','downstream','tw'),
  ('2421','2382','downstream','tw'),
  ('2421','6669','downstream','tw'),
  ('2360','2330','downstream','tw'),
  ('3450','2330','downstream','tw'),
  ('6510','2330','downstream','tw'),
  ('3680','2330','downstream','tw'),
  ('3131','2330','downstream','tw'),
  ('2360','3711','downstream','tw'),
  ('6510','3711','downstream','tw'),
  ('2376','2382','competitor','tw'),
  ('2324','2356','competitor','tw'),
  ('6239','3711','competitor','tw'),
  ('2360','3450','competitor','tw'),
  ('3450','6510','competitor','tw')
on conflict (from_symbol, to_symbol, relation, market) do nothing;
