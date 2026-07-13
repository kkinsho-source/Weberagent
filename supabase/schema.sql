-- ============================================================
-- AI 智慧產業地圖 — Supabase Schema (Phase 2)
-- 對應 PROJECT_PLAN.md §4 核心表（台股 / 美股 / 日股 / 題材 / 供應鏈 / 法人 / ETF / 新聞 / AI / 用戶）
-- 用法：Supabase Studio → SQL Editor → 貼上 → Run
-- 注意：本檔含 RLS 初步策略；financials/major_holder/ai_analysis 細節欄位預留 Premium 遮罩（Phase 4 啟用）
-- ============================================================

-- ---------- 基礎維度表 ----------
create table if not exists market (
  id   text primary key,          -- 'tw' | 'us' | 'jp'
  code text not null unique
);
insert into market (id, code) values
  ('tw','tw'), ('us','us'), ('jp','jp')
on conflict (id) do nothing;

create table if not exists industry (
  id    serial primary key,
  name  text not null unique
);

create table if not exists theme (
  id           uuid primary key default gen_random_uuid(),
  market_id    text not null references market(id),
  slug         text not null unique,
  title        text not null,
  description  text,
  verified_at  date,
  company_count int default 0
);

-- ---------- 個股主表 ----------
create table if not exists stock (
  id           uuid primary key default gen_random_uuid(),
  symbol       text not null,
  market_id    text not null references market(id),
  name         text not null,
  industry_id  int references industry(id),
  market_cap   numeric,           -- 億
  price        numeric,
  change_pct   numeric,
  updated_at   timestamptz default now(),
  unique (symbol, market_id)
);
create index if not exists stock_symbol_market_idx on stock(symbol, market_id);

create table if not exists theme_stock (
  theme_id  uuid not null references theme(id) on delete cascade,
  stock_id  uuid not null references stock(id) on delete cascade,
  primary key (theme_id, stock_id)
);

-- ---------- 供應鏈圖（邊）----------
create table if not exists supply_edge (
  id        uuid primary key default gen_random_uuid(),
  from_stock uuid not null references stock(id) on delete cascade,
  to_stock   uuid not null references stock(id) on delete cascade,
  relation  text not null check (relation in ('upstream','downstream','competitor'))
);
create index if not exists supply_edge_from_idx on supply_edge(from_stock);
create index if not exists supply_edge_to_idx on supply_edge(to_stock);

-- ---------- 每日行情快照 ----------
create table if not exists stock_daily (
  stock_id  uuid not null references stock(id) on delete cascade,
  date      date not null,
  open      numeric, high numeric, low numeric, close numeric,
  volume    bigint,
  change_pct numeric,
  primary key (stock_id, date)
);
create index if not exists stock_daily_date_idx on stock_daily(date desc);

-- ---------- 法人 / 資券 ----------
create table if not exists institutional (
  stock_id      uuid not null references stock(id) on delete cascade,
  date          date not null,
  foreign_net   numeric,   -- 外資買賣超
  invest_net    numeric,   -- 投信
  dealer_net    numeric,   -- 自營商
  margin_balance numeric,  -- 融資餘額
  short_balance   numeric, -- 融券餘額
  primary key (stock_id, date)
);

-- ---------- 集保大戶 ----------
create table if not exists major_holder (
  stock_id     uuid not null references stock(id) on delete cascade,
  week         date not null,
  hold_pct     numeric,
  change_shares numeric,
  primary key (stock_id, week)
);

-- ---------- 主動式 ETF 持股變動 ----------
create table if not exists etf (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);
create table if not exists etf_holding (
  etf_id   uuid not null references etf(id) on delete cascade,
  stock_id uuid not null references stock(id) on delete cascade,
  date     date not null,
  action   text not null check (action in ('add','increase','decrease','remove')),
  primary key (etf_id, stock_id, date)
);

-- ---------- 新聞 / 重大資訊 ----------
create table if not exists news (
  id           uuid primary key default gen_random_uuid(),
  source       text,
  title        text not null,
  url          text,
  published_at timestamptz,
  summary      text,
  theme_tags   text[]
);
create table if not exists mops_announcement (
  id         uuid primary key default gen_random_uuid(),
  stock_id   uuid references stock(id) on delete cascade,
  date       date not null,
  type       text,
  title      text
);

-- ---------- AI 分析 ----------
create table if not exists ai_analysis (
  id         uuid primary key default gen_random_uuid(),
  stock_id   uuid references stock(id) on delete cascade,
  theme_id   uuid references theme(id) on delete cascade,
  content    text,
  model      text,
  created_at timestamptz default now()
);

-- ---------- pgvector 語意搜尋（相似個股/題材推薦, Phase 4 用）----------
create extension if not exists vector;
create table if not exists ai_embedding (
  stock_id  uuid primary key references stock(id) on delete cascade,
  embedding vector(1536)
);

-- ---------- 用戶 / 訂閱 ----------
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  plan             text not null default 'free' check (plan in ('free','premium')),
  subscribed_until timestamptz
);

-- ============================================================
-- Row Level Security (RLS)
-- 原則：公開表全讀；需要登入/付費的表在 API 層額外欄位遮罩（雙保險）。
-- ============================================================
alter table stock         enable row level security;
alter table theme          enable row level security;
alter table theme_stock    enable row level security;
alter table supply_edge    enable row level security;
alter table stock_daily    enable row level security;
alter table institutional  enable row level security;
alter table etf            enable row level security;
alter table etf_holding    enable row level security;
alter table news           enable row level security;
alter table market         enable row level security;
alter table industry       enable row level security;

-- 公開唯讀（匿名 + 已登入皆可讀）
create policy "public read stock"      on stock      for select using (true);
create policy "public read theme"       on theme       for select using (true);
create policy "public read theme_stock"  on theme_stock  for select using (true);
create policy "public read supply_edge"  on supply_edge  for select using (true);
create policy "public read stock_daily"  on stock_daily  for select using (true);
create policy "public read institutional" on institutional for select using (true);
create policy "public read etf"          on etf         for select using (true);
create policy "public read etf_holding"  on etf_holding  for select using (true);
create policy "public read news"         on news        for select using (true);
create policy "public read market"       on market      for select using (true);
create policy "public read industry"     on industry    for select using (true);

-- 寫入僅 service_role（ETL 後端）— 前端 anon key 不可寫，故不建寫入 policy
-- profiles 由 Supabase Auth 觸發器在註冊時建立（見 README）

-- ============================================================
-- 種子：從現有 mock（lib/data/mock.ts）灌入題材 + 個股 + 供應鏈
-- 真實報價由 ETL (scripts/etl/twse_daily.py) upsert 進 stock.price
-- ============================================================
-- 題材種子
insert into theme (market_id, slug, title, description, verified_at, company_count) values
  ('tw','ic_design_asic','IC 設計｜客製 ASIC 與矽智財','隨著全球 CSP 推動去輝達化與晶片自研，矽智財授權與客製 ASIC 成為 AI 算力落地核心基礎設施。','2026-06-24',15),
  ('tw','ic_design_hpc','IC 設計｜HPC 與網通 IC','聚焦 AI 資料中心、HPC 與 5G/WiFi 網通核心晶片。','2026-06-30',14),
  ('tw','foundry','晶圓代工','先進製程與成熟製程晶圓代工，AI 與 HPC 需求核心提供者。','2026-06-30',4),
  ('tw','advanced_packaging','AI 先進封裝','CoWoS、SoIC 等先進封裝產能為 AI 晶片落地關鍵瓶頸。','2026-07-01',9),
  ('tw','ai_server','AI 伺服器組裝','AI 機柜與伺服器組裝 ODM，受惠雲端資本支出成長。','2026-07-02',6),
  ('tw','pcb_ccl','PCB / CCL 載板','AI 伺服器所需高頻高速 PCB、IC 載板與銅箔基板供應鏈。','2026-07-03',11)
on conflict (slug) do nothing;

-- 個股種子（industry 自動建，price/change_pct 先留 null，ETL 補）
create or replace function seed_stock(p_symbol text, p_name text, p_industry text)
returns uuid language plpgsql as $$
declare
  v_ind_id int;
  v_stock_id uuid;
begin
  insert into industry (name) values (p_industry) on conflict (name) do nothing;
  select id into v_ind_id from industry where name = p_industry;
  insert into stock (symbol, market_id, name, industry_id)
  values (p_symbol, 'tw', p_name, v_ind_id)
  on conflict (symbol, market_id) do update set name = excluded.name, industry_id = excluded.industry_id
  returning id into v_stock_id;
  return v_stock_id;
end; $$;

-- 題材↔個股 關聯 helper
create or replace function link_theme(p_slug text, p_symbol text)
returns void language plpgsql as $$
begin
  insert into theme_stock (theme_id, stock_id)
  select t.id, s.id from theme t, stock s
  where t.slug = p_slug and s.symbol = p_symbol
  on conflict do nothing;
end; $$;

-- 灌 20 檔（symbol, name, industry, theme_slug）
select seed_stock('3443','創意','IC 設計'); select link_theme('ic_design_asic','3443');
select seed_stock('3661','世芯-KY','IC 設計'); select link_theme('ic_design_asic','3661');
select seed_stock('3035','智原','IC 設計'); select link_theme('ic_design_asic','3035');
select seed_stock('6643','M31','IP'); select link_theme('ic_design_asic','6643');
select seed_stock('6533','晶心科','IP'); select link_theme('ic_design_asic','6533');
select seed_stock('2454','聯發科','IC 設計'); select link_theme('ic_design_hpc','2454');
select seed_stock('2379','瑞昱','IC 設計'); select link_theme('ic_design_hpc','2379');
select seed_stock('5274','信驊','IC 設計'); select link_theme('ic_design_hpc','5274');
select seed_stock('2330','台積電','晶圓代工'); select link_theme('foundry','2330');
select seed_stock('2303','聯電','晶圓代工'); select link_theme('foundry','2303');
select seed_stock('3711','日月光投控','封測'); select link_theme('advanced_packaging','3711');
select seed_stock('2449','京元電','封測'); select link_theme('advanced_packaging','2449');
select seed_stock('6257','矽格','封測'); select link_theme('advanced_packaging','6257');
select seed_stock('2317','鴻海','組裝'); select link_theme('ai_server','2317');
select seed_stock('2382','廣達','組裝'); select link_theme('ai_server','2382');
select seed_stock('6669','緯穎','組裝'); select link_theme('ai_server','6669');
select seed_stock('4958','臻鼎-KY','PCB'); select link_theme('pcb_ccl','4958');
select seed_stock('3037','欣興','PCB'); select link_theme('pcb_ccl','3037');
select seed_stock('8046','南電','PCB'); select link_theme('pcb_ccl','8046');
select seed_stock('2383','台光電','CCL'); select link_theme('pcb_ccl','2383');

-- 供應鏈邊（source=上游, target=下游）
insert into supply_edge (from_stock, to_stock, relation)
select a.id, b.id, 'downstream' from stock a, stock b
where (a.symbol, b.symbol) in (
  ('3443','2330'),('3661','2330'),('3035','2330'),('6643','2330'),('6533','2330'),
  ('2454','2330'),('2379','2330'),('5274','2330'),
  ('2330','3711'),('2330','2449'),('2330','6257'),
  ('3711','2317'),('3711','2382'),('3711','6669'),
  ('8046','2317'),('3037','2317'),('2383','2317')
) on conflict do nothing;

drop function if exists seed_stock(text,text,text);
drop function if exists link_theme(text,text);
