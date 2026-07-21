-- 個股三大法人日淨超（股）— 供 theme_flow / 資金雷達
-- 請在 Supabase SQL Editor 執行一次（可重跑）

create table if not exists public.stock_institutional_daily (
  id          uuid primary key default gen_random_uuid(),
  symbol      text not null,
  market      text not null default 'tw',
  trade_date  date not null,
  net_shares  bigint not null default 0,
  source      text,
  created_at  timestamptz not null default now(),
  unique (symbol, market, trade_date)
);

create index if not exists stock_inst_daily_date_idx
  on public.stock_institutional_daily (trade_date desc);

create index if not exists stock_inst_daily_symbol_idx
  on public.stock_institutional_daily (symbol);

alter table public.stock_institutional_daily enable row level security;

drop policy if exists "public read stock_institutional_daily" on public.stock_institutional_daily;
create policy "public read stock_institutional_daily"
  on public.stock_institutional_daily for select using (true);

-- service_role 寫入不受 RLS 阻斷（預設）
