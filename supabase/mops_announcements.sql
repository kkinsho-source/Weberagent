-- ============================================================
-- MOPS 重大訊息表（可單獨在 SQL Editor 執行；亦已併入 schema 擴充）
-- ============================================================

create table if not exists public.mops_announcements (
  id            uuid primary key default gen_random_uuid(),
  symbol        text not null,
  company_name  text,
  speak_date    date not null,          -- 發言日期 (ISO)
  speak_time    text,                   -- 發言時間 HH:MM:SS 或原始字串
  title         text not null,          -- 主旨
  content       text,                   -- 說明全文（OpenAPI 有；公司頁可能空）
  clause        text,                   -- 符合條款 e.g. 第51款
  event_date    date,                   -- 事實發生日
  market        text not null default 'tw',
  source        text not null,          -- openapi_t187ap04_L | mopsov_t05st01
  fingerprint   text not null unique,   -- 去重鍵
  raw           jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists mops_ann_symbol_date_idx
  on public.mops_announcements (symbol, speak_date desc);
create index if not exists mops_ann_speak_date_idx
  on public.mops_announcements (speak_date desc);

alter table public.mops_announcements enable row level security;

drop policy if exists "public read mops_announcements" on public.mops_announcements;
create policy "public read mops_announcements"
  on public.mops_announcements for select using (true);

-- 寫入僅 service_role（不建 public write policy）
