'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalFavorites } from '@/lib/store/favorites';
import { StockCard } from '@/components/ui/StockCard';
import type { Stock } from '@/lib/types';

export default function FavoritesPage() {
  const { configured, user, loading } = useAuth();
  const local = useLocalFavorites();
  const [cloudSymbols, setCloudSymbols] = useState<string[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [source, setSource] = useState<'cloud' | 'local'>('local');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 拉行情清單
      try {
        const res = await fetch('/api/v1/stocks');
        const json = await res.json();
        if (!cancelled) setStocks(json.stocks ?? []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (configured && user) {
        setSource('cloud');
        const sb = getSupabaseBrowserClient();
        if (!sb) return;
        const { data, error } = await sb
          .from('favorites')
          .select('symbol')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (cancelled) return;
        if (error) setErr(error.message);
        else setCloudSymbols((data ?? []).map((r) => r.symbol as string));
      } else {
        setSource('local');
        setCloudSymbols([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, user]);

  const symbols = source === 'cloud' ? cloudSymbols : local.symbols;

  const favStocks = useMemo(() => {
    const map = new Map(stocks.map((s) => [s.symbol, s]));
    return symbols
      .map((sym) => map.get(sym))
      .filter((s): s is Stock => Boolean(s));
  }, [stocks, symbols]);

  // 有代號但沒有行情列的（例如全市場推送後的代號）
  const missing = symbols.filter((s) => !stocks.some((x) => x.symbol === s));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">我的自選股</h1>
          <p className="mt-1 text-xs text-slate-400">
            模式：
            <span className="font-medium text-slate-600">
              {source === 'cloud' ? '雲端 favorites（Supabase）' : '本機 localStorage'}
            </span>
            {loading ? ' · 載入中…' : null}
          </p>
        </div>
        {!user && (
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            登入以雲端同步
          </Link>
        )}
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {favStocks.length === 0 && missing.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          尚未收藏任何個股。
          <div className="mt-2">
            到{' '}
            <Link href="/stock/2330" className="text-brand-600 hover:underline">
              台積電
            </Link>{' '}
            或題材頁點「☆ 收藏」開始。
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {favStocks.map((s) => (
            <StockCard key={s.symbol} stock={s} />
          ))}
          {missing.map((sym) => (
            <Link
              key={sym}
              href={`/stock/${sym}`}
              className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm hover:border-brand-300"
            >
              {sym}
              <div className="text-xs text-slate-400">行情尚未載入核心清單</div>
            </Link>
          ))}
        </div>
      )}

      {source === 'local' && local.symbols.length > 0 && (
        <button
          type="button"
          className="text-xs text-slate-400 underline hover:text-slate-600"
          onClick={() => local.clear()}
        >
          清空本機自選
        </button>
      )}
    </div>
  );
}
