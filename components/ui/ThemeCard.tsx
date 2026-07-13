import Link from 'next/link';
import type { Theme } from '@/lib/types';

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Link
      href={`/themes/${theme.slug}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-500 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 group-hover:text-brand-600">
          {theme.title}
        </h3>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
          {theme.companyCount} 家
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-500">
        {theme.description}
      </p>
      <div className="mt-3 text-xs text-slate-400">核實於 {theme.verifiedAt}</div>
    </Link>
  );
}
