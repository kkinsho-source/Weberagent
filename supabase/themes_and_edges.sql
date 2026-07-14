-- 題材 + 供應鏈邊（請在 Supabase SQL Editor 執行一次）
-- 補齊 core_tables 之後缺少的地圖資料層

create table if not exists public.themes (
  id            uuid primary key default gen_random_uuid(),
  market        text not null default 'tw',
  slug          text not null unique,
  title         text not null,
  description   text,
  verified_at   date,
  company_count int default 0
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
  ('tw','ic_design_asic','IC 設計｜客製 ASIC 與矽智財','CSP 去輝達化與晶片自研，矽智財與客製 ASIC 為 AI 算力核心。','2026-06-24',15),
  ('tw','ic_design_hpc','IC 設計｜HPC 與網通 IC','AI 資料中心、HPC 與 5G/WiFi 網通核心晶片。','2026-06-30',14),
  ('tw','foundry','晶圓代工','先進/成熟製程晶圓代工。','2026-06-30',4),
  ('tw','advanced_packaging','AI 先進封裝','CoWoS、SoIC 等先進封裝。','2026-07-01',9),
  ('tw','ai_server','AI 伺服器組裝','AI 伺服器 ODM。','2026-07-02',6),
  ('tw','pcb_ccl','PCB / CCL 載板','高頻高速 PCB / 載板 / CCL。','2026-07-03',11)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  verified_at = excluded.verified_at,
  company_count = excluded.company_count;

insert into public.supply_edges (from_symbol, to_symbol, relation, market)
values
  ('3443','2330','downstream','tw'),
  ('3661','2330','downstream','tw'),
  ('3035','2330','downstream','tw'),
  ('6643','2330','downstream','tw'),
  ('6533','2330','downstream','tw'),
  ('2454','2330','downstream','tw'),
  ('2379','2330','downstream','tw'),
  ('5274','2330','downstream','tw'),
  ('2330','3711','downstream','tw'),
  ('2330','2449','downstream','tw'),
  ('2330','6257','downstream','tw'),
  ('3711','2317','downstream','tw'),
  ('3711','2382','downstream','tw'),
  ('3711','6669','downstream','tw'),
  ('8046','2317','downstream','tw'),
  ('3037','2317','downstream','tw'),
  ('2383','2317','downstream','tw')
on conflict (from_symbol, to_symbol, relation, market) do nothing;
