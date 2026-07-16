'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthNav } from '@/components/auth/AuthNav';
import { SITE_NAME } from '@/lib/site';
import { StockSearch } from '@/components/layout/StockSearch';

const links = [
  { href: '/', label: '首頁' },
  { href: '/themes', label: '題材' },
  { href: '/announcements', label: '重大訊息' },
  { href: '/favorites', label: '自選' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <span className="shrink-0 text-xl">🧭</span>
          <span className="truncate text-base font-bold text-slate-800 sm:text-lg">
            {SITE_NAME}
          </span>
        </Link>

        <div className="mx-auto hidden min-w-0 flex-1 max-w-xs md:block">
          <StockSearch />
        </div>

        <nav className="ml-auto hidden items-center gap-4 text-sm text-slate-600 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-brand-600">
              {l.label}
            </Link>
          ))}
          <AuthNav />
          <Link
            href="/pricing"
            className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
          >
            升級
          </Link>
        </nav>

        <button
          type="button"
          className="ml-auto rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 lg:hidden"
          aria-expanded={open}
          aria-label="選單"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '關閉' : '選單'}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="mb-3">
            <StockSearch onNavigate={() => setOpen(false)} />
          </div>
          <div className="flex flex-col gap-2 text-sm text-slate-700">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-2 py-2 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <div className="px-2 py-1">
              <AuthNav />
            </div>
            <Link
              href="/pricing"
              className="rounded-lg bg-brand-600 px-3 py-2 text-center font-medium text-white"
              onClick={() => setOpen(false)}
            >
              升級
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
