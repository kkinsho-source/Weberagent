'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Profile = {
  fullName?: string;
  shortName?: string;
  industryCode?: string;
  industryName?: string;
  address?: string;
  chairman?: string;
  generalManager?: string;
  spokesman?: string;
  spokesmanTitle?: string;
  phone?: string;
  established?: string;
  listedDate?: string;
  paidInCapital?: string;
  parValue?: string;
  taxId?: string;
  privateShares?: string;
  preferredShares?: string;
  dataSource?: string;
};

type Valuation = {
  pe: number | null;
  pb: number | null;
  dividendYield: number | null;
  high52: number | null;
  low52: number | null;
  avgVolume20: number | null;
  dataSource?: string;
};

type Highlight = {
  lastRevenue?: {
    yearMonth: string;
    revenue: number;
    yoyPct: number | null;
  } | null;
  lastEps?: { year: number; season: number; eps: number } | null;
};

export function BasicInfoPanel({
  symbol,
  industry,
  themeSlug,
}: {
  symbol: string;
  industry?: string;
  themeSlug?: string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [val, setVal] = useState<Valuation | null>(null);
  const [hl, setHl] = useState<Highlight | null>(null);
  const [quote, setQuote] = useState<{
    price?: number;
    changePct?: number;
    name?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stock-profile/${symbol}`, { cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || res.statusText);
        setProfile(json.profile);
        setVal(json.valuation);
        setHl(json.highlight || null);
        setQuote(json.stock || null);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">載入基本資料…</div>;
  if (err) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;

  const fmtCap = (s?: string) => {
    if (!s) return '—';
    const n = Number(String(s).replace(/,/g, ''));
    if (!Number.isFinite(n)) return s;
    return `${(n / 1e8).toFixed(2)} 億`;
  };

  const up = (quote?.changePct ?? 0) >= 0;

  return (
    <div className="space-y-5">
      {/* B-B 今日行情卡 */}
      {quote && (
        <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
          <div className="text-xs text-slate-400">今日行情（與頁首同源）</div>
          <div className="mt-1 flex flex-wrap items-end gap-4">
            <div>
              <div className={`text-2xl font-bold tabular-nums ${up ? 'text-up' : 'text-down'}`}>
                {Number(quote.price || 0).toLocaleString()}
              </div>
              <div className={`text-sm font-medium ${up ? 'text-up' : 'text-down'}`}>
                {up ? '+' : ''}
                {Number(quote.changePct || 0).toFixed(2)}%
              </div>
            </div>
            <div className="text-xs text-slate-500">
              {quote.name || symbol}
              {val?.avgVolume20 != null && (
                <div>近20日均量 {val.avgVolume20.toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {(hl?.lastRevenue || hl?.lastEps) && (
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {hl.lastRevenue && (
            <KV
              k="最新月營收"
              v={`${(hl.lastRevenue.revenue / 1000).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })} 百萬（${hl.lastRevenue.yearMonth}）`}
            />
          )}
          {hl.lastRevenue?.yoyPct != null && (
            <KV
              k="營收年增"
              v={`${hl.lastRevenue.yoyPct >= 0 ? '+' : ''}${hl.lastRevenue.yoyPct.toFixed(1)}%`}
            />
          )}
          {hl.lastEps && (
            <KV k="最近季 EPS" v={`${hl.lastEps.year} Q${hl.lastEps.season} · ${hl.lastEps.eps.toFixed(2)} 元`} />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <KV k="公司全名" v={profile?.fullName || '—'} />
        <KV k="統一編號" v={profile?.taxId || '—'} />
        <KV k="產業" v={profile?.industryName || industry || '—'} />
        <KV k="產業代碼" v={profile?.industryCode || '—'} />
        <KV k="題材" v={themeSlug || '—'} />
        <KV k="面額" v={profile?.parValue || '—'} />
        <KV k="董事長" v={profile?.chairman || '—'} />
        <KV k="總經理" v={profile?.generalManager || '—'} />
        <KV
          k="發言人"
          v={
            profile?.spokesman
              ? `${profile.spokesman}${profile.spokesmanTitle ? `（${profile.spokesmanTitle}）` : ''}`
              : '—'
          }
        />
        <KV k="成立日期" v={profile?.established || '—'} />
        <KV k="上市日期" v={profile?.listedDate || '—'} />
        <KV k="實收資本額" v={fmtCap(profile?.paidInCapital)} />
        <KV k="總機" v={profile?.phone || '—'} />
        <KV k="私募股數" v={profile?.privateShares || '—'} />
        <KV k="特別股" v={profile?.preferredShares || '—'} />
        <div className="col-span-2 sm:col-span-3">
          <KV k="地址" v={profile?.address || '—'} />
        </div>
      </div>
      {profile?.dataSource && (
        <p className="text-[11px] text-slate-400">基本資料來源：{profile.dataSource}</p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">市場數據</h3>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <KV k="本益比 (PER)" v={val?.pe != null ? val.pe.toFixed(2) : '—'} />
          <KV k="股價淨值比 (PBR)" v={val?.pb != null ? val.pb.toFixed(2) : '—'} />
          <KV
            k="殖利率 %"
            v={val?.dividendYield != null ? val.dividendYield.toFixed(2) : '—'}
          />
          <KV k="近52週高" v={val?.high52 != null ? val.high52.toLocaleString() : '—'} />
          <KV k="近52週低" v={val?.low52 != null ? val.low52.toLocaleString() : '—'} />
          <KV
            k="近20日均量"
            v={val?.avgVolume20 != null ? val.avgVolume20.toLocaleString() : '—'}
          />
        </div>
        {val?.dataSource && val.dataSource !== 'none' && (
          <p className="mt-2 text-[11px] text-slate-400">估值來源：{val.dataSource}</p>
        )}
      </div>

      <p className="text-xs text-slate-400">
        ETF 持股請見獨立分頁「ETF」。更完整供應鏈見「供應鏈 / 產業分析」。
        {themeSlug && (
          <>
            {' '}
            <Link href={`/themes/${themeSlug}`} className="text-brand-600 hover:underline">
              前往題材頁
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="mt-0.5 break-words font-medium text-slate-800">{v}</div>
    </div>
  );
}
