-- ============================================================
-- AI 智慧產業地圖 — Supabase Schema (Phase 2 整合版)
-- 用法：Supabase Studio → SQL Editor → 貼上本檔 → Run
-- ============================================================

-- ---------- 擴充 ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1) users / profiles（Auth 用；真正帳號在 auth.users）
-- ============================================================
-- 說明：Supabase 內建 auth.users。我們用 profiles 存應用層欄位。
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text,
  plan             text not null default 'free'
                     check (plan in ('free', 'premium')),
  subscribed_until timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 註冊時自動建立 profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2) stocks（個股基本資料 + 最新報價）
-- ============================================================
create table if not exists public.stocks (
  id          uuid primary key default gen_random_uuid(),
  symbol      text not null,
  market      text not null default 'tw'
                check (market in ('tw', 'us', 'jp')),
  name        text not null,
  industry    text,
  theme_slug  text,
  price       numeric,
  change_pct  numeric,
  market_cap  numeric,           -- 億
  as_of       date,              -- 行情日期
  updated_at  timestamptz not null default now(),
  unique (symbol, market)
);
create index if not exists stocks_symbol_idx on public.stocks (symbol);
create index if not exists stocks_theme_idx on public.stocks (theme_slug);
create index if not exists stocks_updated_idx on public.stocks (updated_at desc);

-- 日線（可選；ETL 可寫入）
create table if not exists public.stock_daily (
  stock_id   uuid not null references public.stocks(id) on delete cascade,
  date       date not null,
  open       numeric,
  high       numeric,
  low        numeric,
  close      numeric,
  volume     bigint,
  change_pct numeric,
  primary key (stock_id, date)
);

-- ============================================================
-- 3) watchlists / favorites（使用者收藏）
-- ============================================================
create table if not exists public.watchlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null default '我的自選',
  created_at timestamptz not null default now()
);
create index if not exists watchlists_user_idx on public.watchlists (user_id);

create table if not exists public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  symbol     text not null,
  market     text not null default 'tw',
  created_at timestamptz not null default now(),
  unique (user_id, symbol, market)
);
create index if not exists favorites_user_idx on public.favorites (user_id);

-- ============================================================
-- 4) etl_logs（資料更新紀錄）
-- ============================================================
create table if not exists public.etl_logs (
  id            uuid primary key default gen_random_uuid(),
  job_name      text not null,              -- e.g. twse_daily
  status        text not null
                  check (status in ('started', 'success', 'failed')),
  source        text,                       -- TWSE STOCK_DAY_ALL
  records_count int default 0,
  message       text,
  meta          jsonb default '{}'::jsonb,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists etl_logs_job_idx on public.etl_logs (job_name, started_at desc);

-- ============================================================
-- 5) 題材 / 供應鏈（與地圖相容，可後續填）
-- ============================================================
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
  market      text not null default 'tw'
);
create index if not exists supply_edges_from_idx on public.supply_edges (from_symbol);
create index if not exists supply_edges_to_idx on public.supply_edges (to_symbol);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles     enable row level security;
alter table public.stocks       enable row level security;
alter table public.stock_daily  enable row level security;
alter table public.watchlists   enable row level security;
alter table public.favorites    enable row level security;
alter table public.etl_logs     enable row level security;
alter table public.themes       enable row level security;
alter table public.supply_edges enable row level security;

-- 公開讀：行情 / 題材 / 供應鏈
drop policy if exists "public read stocks" on public.stocks;
create policy "public read stocks" on public.stocks for select using (true);

drop policy if exists "public read stock_daily" on public.stock_daily;
create policy "public read stock_daily" on public.stock_daily for select using (true);

drop policy if exists "public read themes" on public.themes;
create policy "public read themes" on public.themes for select using (true);

drop policy if exists "public read supply_edges" on public.supply_edges;
create policy "public read supply_edges" on public.supply_edges for select using (true);

-- etl_logs：公開只讀最近成功紀錄（可改為 service only）
drop policy if exists "public read etl_logs" on public.etl_logs;
create policy "public read etl_logs" on public.etl_logs for select using (true);

-- profiles：本人讀寫
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

-- watchlists / favorites：本人 CRUD
drop policy if exists "watchlists own all" on public.watchlists;
create policy "watchlists own all" on public.watchlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "favorites own all" on public.favorites;
create policy "favorites own all" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 寫入 stocks / etl_logs 僅 service_role（不建 public write policy）
-- ETL 使用 SUPABASE_SERVICE_ROLE_KEY 繞過 RLS

-- ============================================================
-- Seed：20 檔核心個股 + 題材 + 供應鏈（價格由 ETL 覆寫）
-- ============================================================
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

insert into public.stocks (symbol, market, name, industry, theme_slug, market_cap) values
  ('3443','tw','創意','IC 設計','ic_design_asic',1620),
  ('3661','tw','世芯-KY','IC 設計','ic_design_asic',2100),
  ('3035','tw','智原','IC 設計','ic_design_asic',380),
  ('6643','tw','M31','IP','ic_design_asic',210),
  ('6533','tw','晶心科','IP','ic_design_asic',520),
  ('2454','tw','聯發科','IC 設計','ic_design_hpc',20000),
  ('2379','tw','瑞昱','IC 設計','ic_design_hpc',2900),
  ('5274','tw','信驊','IC 設計','ic_design_hpc',2400),
  ('2330','tw','台積電','晶圓代工','foundry',306000),
  ('2303','tw','聯電','晶圓代工','foundry',6600),
  ('3711','tw','日月光投控','封測','advanced_packaging',7800),
  ('2449','tw','京元電','封測','advanced_packaging',1650),
  ('6257','tw','矽格','封測','advanced_packaging',720),
  ('2317','tw','鴻海','組裝','ai_server',30500),
  ('2382','tw','廣達','組裝','ai_server',14800),
  ('6669','tw','緯穎','組裝','ai_server',5200),
  ('4958','tw','臻鼎-KY','PCB','pcb_ccl',2600),
  ('3037','tw','欣興','PCB','pcb_ccl',2700),
  ('8046','tw','南電','PCB','pcb_ccl',3900),
  ('2383','tw','台光電','CCL','pcb_ccl',3100)
on conflict (symbol, market) do update set
  name = excluded.name,
  industry = excluded.industry,
  theme_slug = excluded.theme_slug,
  market_cap = excluded.market_cap,
  updated_at = now();

insert into public.supply_edges (from_symbol, to_symbol, relation, market)
select * from (values
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
) as v(from_symbol, to_symbol, relation, market)
where not exists (
  select 1 from public.supply_edges e
  where e.from_symbol = v.from_symbol
    and e.to_symbol = v.to_symbol
    and e.relation = v.relation
    and e.market = v.market
);
