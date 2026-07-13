-- ============================================================
-- Supabase 完整整合 Schema（可單獨執行或接在 schema.sql 後）
-- 對齊產品需求：stocks / stock_prices / etl_logs / mops_announcements
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- stocks：個股基本資料 + 最新價格快照 ----------
create table if not exists public.stocks (
  id          uuid primary key default gen_random_uuid(),
  symbol      text not null,
  market      text not null default 'tw'
                check (market in ('tw', 'us', 'jp')),
  name        text not null,
  industry    text,
  theme_slug  text,
  price       numeric,              -- 最新收盤/即時價
  change_pct  numeric,              -- 漲跌幅 %
  market_cap  numeric,              -- 億
  as_of       date,                 -- 行情日期
  updated_at  timestamptz not null default now(),
  unique (symbol, market)
);
create index if not exists stocks_symbol_idx on public.stocks (symbol);
create index if not exists stocks_theme_idx on public.stocks (theme_slug);
create index if not exists stocks_updated_idx on public.stocks (updated_at desc);

-- ---------- stock_prices：歷史 / 日線時間序列 ----------
create table if not exists public.stock_prices (
  id          uuid primary key default gen_random_uuid(),
  symbol      text not null,
  market      text not null default 'tw',
  trade_date  date not null,
  open        numeric,
  high        numeric,
  low         numeric,
  close       numeric not null,
  volume      bigint,
  change_pct  numeric,
  source      text default 'TWSE',
  created_at  timestamptz not null default now(),
  unique (symbol, market, trade_date)
);
create index if not exists stock_prices_symbol_date_idx
  on public.stock_prices (symbol, trade_date desc);
create index if not exists stock_prices_trade_date_idx
  on public.stock_prices (trade_date desc);

-- 相容舊表 stock_daily（若已存在可保留；新程式優先用 stock_prices）
create table if not exists public.stock_daily (
  stock_id   uuid references public.stocks(id) on delete cascade,
  date       date not null,
  open       numeric, high numeric, low numeric, close numeric,
  volume     bigint,
  change_pct numeric,
  primary key (stock_id, date)
);

-- ---------- etl_logs：資料更新紀錄 ----------
create table if not exists public.etl_logs (
  id            uuid primary key default gen_random_uuid(),
  job_name      text not null,
  status        text not null
                  check (status in ('started', 'success', 'failed')),
  source        text,
  records_count int default 0,
  message       text,
  meta          jsonb default '{}'::jsonb,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index if not exists etl_logs_job_idx
  on public.etl_logs (job_name, started_at desc);

-- ---------- mops_announcements：重大訊息（可先空表） ----------
create table if not exists public.mops_announcements (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  company_name  text,
  speak_date    date not null,
  speak_time    text,
  title         text not null,
  content       text,
  clause        text,
  event_date    date,
  market        text not null default 'tw',
  source        text not null default 'openapi_t187ap04_L',
  fingerprint   text not null unique,
  raw           jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists mops_ann_symbol_date_idx
  on public.mops_announcements (symbol, speak_date desc);
create index if not exists mops_ann_speak_date_idx
  on public.mops_announcements (speak_date desc);

-- ---------- RLS ----------
alter table public.stocks enable row level security;
alter table public.stock_prices enable row level security;
alter table public.etl_logs enable row level security;
alter table public.mops_announcements enable row level security;

drop policy if exists "public read stocks" on public.stocks;
create policy "public read stocks" on public.stocks for select using (true);

drop policy if exists "public read stock_prices" on public.stock_prices;
create policy "public read stock_prices" on public.stock_prices for select using (true);

drop policy if exists "public read etl_logs" on public.etl_logs;
create policy "public read etl_logs" on public.etl_logs for select using (true);

drop policy if exists "public read mops_announcements" on public.mops_announcements;
create policy "public read mops_announcements" on public.mops_announcements for select using (true);

-- 寫入僅 service_role（不建 public insert/update policy）

-- ---------- 核心 20 檔種子（價格由 ETL 覆寫） ----------
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
