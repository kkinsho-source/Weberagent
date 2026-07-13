'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useLocalFavorites } from '@/lib/store/favorites';

type Props = {
  symbol: string;
  market?: string;
  className?: string;
};

/**
 * 收藏按鈕
 * - 已登入 + Supabase：寫入 favorites 表
 * - 否則：localStorage（zustand persist）示範
 */
export function FavoriteButton({ symbol, market = 'tw', className = '' }: Props) {
  const { configured, user } = useAuth();
  const local = useLocalFavorites();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const useCloud = configured && Boolean(user);

  // 同步初始狀態
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!useCloud) {
        setOn(local.has(symbol));
        return;
      }
      const sb = getSupabaseBrowserClient();
      if (!sb || !user) return;
      const { data } = await sb
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .eq('market', market)
        .maybeSingle();
      if (!cancelled) setOn(Boolean(data));
    })();
    return () => {
      cancelled = true;
    };
  }, [useCloud, user, symbol, market, local]);

  const toggle = useCallback(async () => {
    setBusy(true);
    setHint(null);
    try {
      if (!useCloud) {
        local.toggle(symbol);
        setOn((v) => !v);
        setHint(user ? null : '已存本機自選（登入後可同步雲端）');
        return;
      }
      const sb = getSupabaseBrowserClient();
      if (!sb || !user) return;

      if (on) {
        const { error } = await sb
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', symbol)
          .eq('market', market);
        if (error) throw error;
        setOn(false);
      } else {
        const { error } = await sb.from('favorites').insert({
          user_id: user.id,
          symbol,
          market: market as 'tw' | 'us' | 'jp',
        });
        if (error) throw error;
        setOn(true);
      }
    } catch (e) {
      setHint(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [useCloud, local, symbol, market, on, user]);

  return (
    <div className={`inline-flex flex-col items-end gap-0.5 ${className}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
          on
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
        } disabled:opacity-50`}
        title={useCloud ? '雲端自選' : '本機自選'}
      >
        {on ? '★ 已收藏' : '☆ 收藏'}
      </button>
      {hint && <span className="max-w-[12rem] text-right text-[10px] text-slate-400">{hint}</span>}
    </div>
  );
}
