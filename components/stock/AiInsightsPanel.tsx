'use client';

import { useEffect, useState } from 'react';

type Insight = {
  stance: 'bullish' | 'neutral' | 'bearish';
  score: number;
  summary: string;
  bullets: string[];
  risks: string[];
  sources: string[];
};

const stanceStyle: Record<string, string> = {
  bullish: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  bearish: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const stanceLabel: Record<string, string> = {
  bullish: '偏多',
  neutral: '中性',
  bearish: '偏空',
};

export function AiInsightsPanel({ symbol }: { symbol: string }) {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/insights/${symbol}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        if (cancelled) return;
        setInsight(json.insight);
        setMeta(json.meta || null);
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

  if (loading) return <div className="py-8 text-center text-sm text-slate-400">生成 AI 洞察…</div>;
  if (err) return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{err}</div>;
  if (!insight) return null;

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border px-4 py-3 ${stanceStyle[insight.stance]}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            綜合立場：{stanceLabel[insight.stance]}（score {insight.score}）
          </span>
          <span className="text-[11px] opacity-70">engine: {(meta?.engine as string) || 'rule'}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">{insight.summary}</p>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">多空論點</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {insight.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">風險提示</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
          {insight.risks.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>

      <div className="text-[11px] text-slate-400">
        資料來源：{insight.sources.join(' · ')}
        {meta ? ` · bars=${meta.bars} mops=${meta.mops}` : ''}
        <br />
        本內容為規則引擎自動產出，非正式投資建議。
      </div>
    </div>
  );
}
