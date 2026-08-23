import Link from 'next/link';
import type { Theme } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { themeColor } from '@/lib/data/theme-colors';
import { ZONE_META, type CompositeRow } from '@/lib/data/theme-composite';

function tierLabel(tier: Theme['tier']): string {
  if (tier === 0) return '粗網';
  if (tier === 2) return '細拆';
  return 'AI鏈';
}

function familyLabel(family: Theme['family']): string {
  switch (family) {
    case 'ai_chain':
      return 'AI';
    case 'defensive':
      return '防禦';
    case 'cyclical':
      return '循環';
    case 'electronics_ex_ai':
      return '其他電子';
    case 'benchmark':
      return '基準';
    default:
      return '其他';
  }
}

function fmtNet(n: number): string {
  const abs = Math.abs(n);
  const body = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1);
  return `${n >= 0 ? '+' : '−'}${body} 億`;
}

export function ThemeCard({
  theme,
  signal,
}: {
  theme: Theme;
  signal?: CompositeRow;
}) {
  const color = themeColor(theme.slug, theme.family);
  const zone = signal ? ZONE_META[signal.zone] : null;
  return (
    <Link href={`/themes/${theme.slug}`} className="block">
      <Card className="h-full p-5 transition hover:border-brand-500 hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <h3 className="font-semibold text-slate-800">{theme.title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
            {theme.companyCount} 家
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
            {tierLabel(theme.tier)}
          </span>
          {theme.family !== 'ai_chain' ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {familyLabel(theme.family)}
            </span>
          ) : null}
          {zone ? (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${zone.badgeBg}`}>
              {zone.label}
            </span>
          ) : null}
        </div>
        {signal ? (
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-slate-600">
            <span>
              S <span className="font-semibold tabular-nums text-slate-800">{signal.scoreS.toFixed(0)}</span>
            </span>
            <span className={signal.net5dYi >= 0 ? 'text-rose-600' : 'text-emerald-700'}>
              近5日 {fmtNet(signal.net5dYi)}
            </span>
          </div>
        ) : null}
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">{theme.description}</p>
        <div className="mt-3 text-xs text-brand-600">查看題材 →</div>
      </Card>
    </Link>
  );
}
