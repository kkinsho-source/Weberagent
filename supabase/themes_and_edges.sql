-- 題材 + 供應鏈邊（請在 Supabase SQL Editor 執行一次）
-- 補齊 core_tables 之後缺少的地圖資料層
-- 可重複執行：themes upsert by slug；edges on conflict do nothing

create table if not exists public.themes (
  id            uuid primary key default gen_random_uuid(),
  market        text not null default 'tw',
  slug          text not null unique,
  title         text not null,
  description   text,
  verified_at   date,
  company_count int default 0,
  tier          smallint not null default 1,
  family        text not null default 'ai_chain',
  radar_default boolean not null default true
);

create table if not exists public.supply_edges (
  id          uuid primary key default gen_random_uuid(),
  from_symbol text not null,
  to_symbol   text not null,
  relation    text not null
                check (relation in ('upstream', 'downstream', 'competitor')),
  market      text not null default 'tw',
  unique (from_symbol, to_symbol, relation, market)
);
create index if not exists supply_edges_from_idx on public.supply_edges (from_symbol);
create index if not exists supply_edges_to_idx on public.supply_edges (to_symbol);

alter table public.themes enable row level security;
alter table public.supply_edges enable row level security;

drop policy if exists "public read themes" on public.themes;
create policy "public read themes" on public.themes for select using (true);

drop policy if exists "public read supply_edges" on public.supply_edges;
create policy "public read supply_edges" on public.supply_edges for select using (true);

insert into public.themes (market, slug, title, description, verified_at, company_count) values
  ('tw','ic_design_asic','IC 設計｜客製 ASIC 與矽智財','CSP 去輝達化與晶片自研，矽智財與客製 ASIC 為 AI 算力核心。','2026-06-24',5),
  ('tw','ic_design_hpc','IC 設計｜HPC 與網通 IC','AI 資料中心、HPC 與 5G/WiFi 網通核心晶片。','2026-06-30',3),
  ('tw','foundry','晶圓代工','先進/成熟製程晶圓代工。','2026-06-30',3),
  ('tw','advanced_packaging','AI 先進封裝','CoWoS、SoIC、載板與測試。','2026-07-01',5),
  ('tw','ai_server','AI 伺服器組裝','AI 伺服器 ODM。','2026-07-02',5),
  ('tw','pcb_ccl','PCB / CCL 載板','高頻高速 PCB / 載板 / CCL。','2026-07-03',5),
  ('tw','thermal_power','AI 散熱與電源','液冷、均熱板、高瓦數電源與電源管理。','2026-07-15',5),
  ('tw','optical_cpo','光通訊 / CPO','資料中心高速光模組、矽光與 CPO 供應鏈。','2026-07-15',4)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  verified_at = excluded.verified_at,
  company_count = excluded.company_count;

insert into public.supply_edges (from_symbol, to_symbol, relation, market)
values
  -- ASIC / IP / HPC → 代工
  ('3443','2330','downstream','tw'),
  ('3661','2330','downstream','tw'),
  ('3035','2330','downstream','tw'),
  ('6643','2330','downstream','tw'),
  ('6533','2330','downstream','tw'),
  ('2454','2330','downstream','tw'),
  ('2379','2330','downstream','tw'),
  ('5274','2330','downstream','tw'),
  ('2454','2303','downstream','tw'),
  -- 代工 → 封測
  ('2330','3711','downstream','tw'),
  ('2330','2449','downstream','tw'),
  ('2330','6257','downstream','tw'),
  ('2330','6271','downstream','tw'),
  ('2303','3711','downstream','tw'),
  ('6770','3711','downstream','tw'),
  -- 載板 → 封測 / 代工
  ('3189','3711','downstream','tw'),
  ('3189','2330','downstream','tw'),
  ('8046','3711','downstream','tw'),
  ('3037','3711','downstream','tw'),
  -- 封測 → 伺服器
  ('3711','2317','downstream','tw'),
  ('3711','2382','downstream','tw'),
  ('3711','6669','downstream','tw'),
  ('3711','3231','downstream','tw'),
  ('3711','2356','downstream','tw'),
  -- PCB / CCL → 伺服器
  ('8046','2317','downstream','tw'),
  ('3037','2317','downstream','tw'),
  ('2383','2317','downstream','tw'),
  ('2383','2382','downstream','tw'),
  ('4958','2382','downstream','tw'),
  ('6213','2382','downstream','tw'),
  ('3037','6669','downstream','tw'),
  -- 散熱 / 電源 → 伺服器
  ('2308','2317','downstream','tw'),
  ('2308','2382','downstream','tw'),
  ('2308','6669','downstream','tw'),
  ('3017','2317','downstream','tw'),
  ('3017','6669','downstream','tw'),
  ('3653','2382','downstream','tw'),
  ('3653','6669','downstream','tw'),
  ('3324','2382','downstream','tw'),
  ('6230','3231','downstream','tw'),
  -- 光通訊
  ('4979','6669','downstream','tw'),
  ('4979','2382','downstream','tw'),
  ('3363','6669','downstream','tw'),
  ('3081','4979','downstream','tw'),
  ('4977','2382','downstream','tw'),
  -- 競品
  ('2330','2303','competitor','tw'),
  ('2317','2382','competitor','tw'),
  ('2382','6669','competitor','tw'),
  ('3017','3653','competitor','tw'),
  ('3443','3661','competitor','tw')
on conflict (from_symbol, to_symbol, relation, market) do nothing;

-- 可選：補上新核心股的靜態列（價格由後續 ETL/cron 覆蓋）
-- 若 stocks 表已有該 symbol 則只更新 theme/industry
insert into public.stocks (symbol, market, name, industry, theme_slug, price, change_pct, market_cap)
values
  ('3443','tw','創意','IC 設計','ic_design_asic',0,0,1620),
  ('3661','tw','世芯-KY','IC 設計','ic_design_asic',0,0,2100),
  ('3035','tw','智原','IC 設計','ic_design_asic',0,0,380),
  ('6643','tw','M31','IP','ic_design_asic',0,0,210),
  ('6533','tw','晶心科','IP','ic_design_asic',0,0,520),
  ('2454','tw','聯發科','IC 設計','ic_design_hpc',0,0,20000),
  ('2379','tw','瑞昱','IC 設計','ic_design_hpc',0,0,2900),
  ('5274','tw','信驊','IC 設計','ic_design_hpc',0,0,2400),
  ('2330','tw','台積電','晶圓代工','foundry',0,0,306000),
  ('2303','tw','聯電','晶圓代工','foundry',0,0,6600),
  ('6770','tw','力積電','晶圓代工','foundry',0,0,900),
  ('3711','tw','日月光投控','封測','advanced_packaging',0,0,7800),
  ('2449','tw','京元電','封測','advanced_packaging',0,0,1650),
  ('6257','tw','矽格','封測','advanced_packaging',0,0,720),
  ('3189','tw','景碩','IC 載板','advanced_packaging',0,0,1600),
  ('6271','tw','同欣電','封測','advanced_packaging',0,0,600),
  ('2317','tw','鴻海','組裝','ai_server',0,0,30500),
  ('2382','tw','廣達','組裝','ai_server',0,0,14800),
  ('6669','tw','緯穎','組裝','ai_server',0,0,5200),
  ('3231','tw','緯創','組裝','ai_server',0,0,4200),
  ('2356','tw','英業達','組裝','ai_server',0,0,2000),
  ('4958','tw','臻鼎-KY','PCB','pcb_ccl',0,0,2600),
  ('3037','tw','欣興','PCB','pcb_ccl',0,0,2700),
  ('8046','tw','南電','PCB','pcb_ccl',0,0,3900),
  ('2383','tw','台光電','CCL','pcb_ccl',0,0,3100),
  ('6213','tw','聯茂','CCL','pcb_ccl',0,0,800),
  ('2308','tw','台達電','電源','thermal_power',0,0,11000),
  ('3017','tw','奇鋐','散熱','thermal_power',0,0,2400),
  ('3653','tw','健策','散熱','thermal_power',0,0,1100),
  ('3324','tw','雙鴻','散熱','thermal_power',0,0,900),
  ('6230','tw','超眾','散熱','thermal_power',0,0,400),
  ('4979','tw','華星光','光通訊','optical_cpo',0,0,350),
  ('3363','tw','上詮','光通訊','optical_cpo',0,0,200),
  ('3081','tw','聯亞','光通訊','optical_cpo',0,0,450),
  ('4977','tw','眾達-KY','光通訊','optical_cpo',0,0,280)
on conflict (symbol, market) do update set
  name = excluded.name,
  industry = excluded.industry,
  theme_slug = excluded.theme_slug,
  market_cap = coalesce(nullif(public.stocks.market_cap, 0), excluded.market_cap);
