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

  const hrefFor = (key: ThemeScope) => {
    const next = new URLSearchParams(sp.toString());
    if (key === defaultScope) next.delete('scope');
    else next.set('scope', key);
    const q = next.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex max-w-full flex-wrap rounded-lg bg-slate-100 p-1">
        {THEME_SCOPE_OPTIONS.map((m) => {
          const active = current === m.key || (m.key === 'ai' && current === 'tier1');
          return (
            <Link
              key={m.key}
              href={hrefFor(m.key)}
              scroll={false}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                active
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title={m.hint}
            >
              {m.label}
            </Link>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400">
        {THEME_SCOPE_OPTIONS.find((o) => o.key === current)?.hint ?? ''}
        <span className="ml-1 text-slate-300">· 切換 scope 會保留權重等其他參數</span>
      </p>
    </div>
  );
}
