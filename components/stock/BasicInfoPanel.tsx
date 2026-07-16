'use client';

import { useEffect, useState } from 'react';

type Profile = {
  fullName?: string;
  shortName?: string;
  address?: string;
  chairman?: string;
  generalManager?: string;
  spokesman?: string;
  phone?: string;
  established?: string;
  listedDate?: string;
  paidInCapital?: string;
  parValue?: string;
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

type Etf = { etf: string; name: string; note?: string };

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
  const [etfs, setEtfs] = useState<Etf[]>([]);
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
        setEtfs(json.etfs || []);
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
    // 實收資本額多為元 → 億
    return `${(n / 1e8).toFixed(2)} 億`;
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <KV k="公司全名" v={profile?.fullName || '—'} />
        <KV k="產業" v={industry || '—'} />
        <KV k="題材" v={themeSlug || '—'} />
        <KV k="董事長" v={profile?.chairman || '—'} />
        <KV k="總經理" v={profile?.generalManager || '—'} />
        <KV k="發言人" v={profile?.spokesman || '—'} />
        <KV k="成立日期" v={profile?.established || '—'} />
        <KV k="上市日期" v={profile?.listedDate || '—'} />
        <KV k="實收資本額" v={fmtCap(profile?.paidInCapital)} />
        <KV k="總機" v={profile?.phone || '—'} />
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

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">相關 ETF（示意）</h3>
        {etfs.length === 0 ? (
          <p className="text-sm text-slate-400">
            暫無編輯的 ETF 對照。後續可接公開成分股檔。
          </p>
        ) : (
          <ul className="space-y-2">
            {etfs.map((e) => (
              <li
                key={e.etf}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-semibold text-brand-600">{e.etf}</span>
                  <span className="ml-2 text-slate-700">{e.name}</span>
                </span>
                {e.note && <span className="text-xs text-slate-400">{e.note}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-slate-400">
          成分與權重會變動，僅供導覽；非即時投信申報。
        </p>
      </div>

      <TradingViewSymbolOverview symbol={symbol} />
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-400">{k}</div>
      <div className="mt-0.5 font-medium text-slate-800 break-words">{v}</div>
    </div>
  );
}

function TradingViewSymbolOverview({ symbol }: { symbol: string }) {
  useEffect(() => {
    const id = `tv_overview_${symbol}`;
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      symbol: `TWSE:${symbol}`,
      width: '100%',
      locale: 'zh_TW',
      colorTheme: 'light',
      isTransparent: true,
    });
    el.appendChild(script);
  }, [symbol]);

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">TradingView 概覽</h3>
      <div
        id={`tv_overview_${symbol}`}
        className="overflow-hidden rounded-xl border border-slate-200 bg-white"
      />
    </div>
  );
}
