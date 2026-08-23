'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { THEME_SCOPE_OPTIONS, type ThemeScope } from '@/lib/data/theme-scope';

export function ThemeScopeTabs({
  basePath = '/themes',
  defaultScope = 'all',
}: {
  basePath?: string;
  defaultScope?: ThemeScope;
}) {
  const sp = useSearchParams();
  const current = (sp.get('scope') as ThemeScope | null) || defaultScope;
  const onRadar = basePath.startsWith('/radar');

  const hrefFor = (key: ThemeScope) => {
    const next = new URLSearchParams(sp.toString());
    if (key === defaultScope) next.delete('scope');
    else next.set('scope', key);
    const q = next.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  const hint = THEME_SCOPE_OPTIONS.find((o) => o.key === current)?.hint ?? '';

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex max-w-full flex-wrap rounded-2xl bg-[#24162f] p-1">
        {THEME_SCOPE_OPTIONS.map((m) => {
          const active = current === m.key || (m.key === 'ai' && current === 'tier1');
          return (
            <Link
              key={m.key}
              href={hrefFor(m.key)}
              scroll={false}
              className={`rounded-2xl px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                active
                  ? 'bg-fuchsia-500/20 text-fuchsia-100 shadow-[0_0_16px_rgba(232,121,249,0.35)]'
                  : 'text-fuchsia-200/60 hover:text-fuchsia-100'
              }`}
              title={m.hint}
            >
              {m.label}
            </Link>
          );
        })}
      </div>
      {hint ? (
        <p className="text-[11px] text-slate-400">
          {hint}
          {onRadar ? (
            <span className="ml-1 text-slate-300">· 切換範圍會保留權重等設定</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
