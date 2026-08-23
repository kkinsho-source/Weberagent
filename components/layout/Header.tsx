'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthNav } from '@/components/auth/AuthNav';
import { SITE_NAME } from '@/lib/site';
import { StockSearch } from '@/components/layout/StockSearch';

const links = [
  { href: '/', label: '首頁' },
  { href: '/themes', label: '題材' },
  { href: '/radar', label: '資金雷達' },
  { href: '/announcements', label: '重大訊息' },
  { href: '/favorites', label: '自選' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() || '/';
  const dark = pathname === '/radar' || pathname.startsWith('/radar/');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-20 border-b backdrop-blur ${
        dark
          ? 'border-cyan-500/15 bg-[#05070d]/90 text-slate-200'
          : 'border-slate-200 bg-white/90 text-slate-800'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <span className="shrink-0 text-xl">🧭</span>
          <span
            className={`hidden truncate text-base font-bold sm:inline sm:text-lg ${
              dark ? 'text-cyan-50' : 'text-slate-800'
            }`}
          >
            {SITE_NAME}
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <StockSearch tone={dark ? 'dark' : 'light'} />
        </div>

        <nav
          className={`ml-1 hidden items-center gap-4 text-sm lg:flex ${
            dark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? dark
                      ? 'font-semibold text-cyan-200'
                      : 'font-semibold text-brand-700'
                    : dark
                      ? 'hover:text-cyan-200'
                      : 'hover:text-brand-600'
                }
              >
                {l.label}
              </Link>
            );
          })}
          <AuthNav />
          <Link
            href="/pricing"
            className={`rounded-lg px-3 py-1.5 font-medium text-white ${
              dark ? 'bg-cyan-700 hover:bg-cyan-600' : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            升級
          </Link>
        </nav>

        <button
          type="button"
          className={`shrink-0 rounded-md border px-2.5 py-1.5 text-sm lg:hidden ${
            dark
              ? 'border-cyan-500/25 text-cyan-100'
              : 'border-slate-200 text-slate-700'
          }`}
          aria-expanded={open}
          aria-label="選單"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '關閉' : '選單'}
        </button>
      </div>

      {open && (
        <div
          className={`border-t px-4 py-3 lg:hidden ${
            dark ? 'border-cyan-500/10 bg-[#05070d]' : 'border-slate-100 bg-white'
          }`}
        >
          <div className={`flex flex-col gap-2 text-sm ${dark ? 'text-slate-200' : 'text-slate-700'}`}>
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-md px-2 py-2 ${
                    active
                      ? dark
                        ? 'bg-cyan-500/10 font-semibold text-cyan-100'
                        : 'bg-brand-50 font-semibold text-brand-700'
                      : dark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-slate-50'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </Link>
              );
            })}
            <div className="px-2 py-1">
              <AuthNav />
            </div>
            <Link
              href="/pricing"
              className={`rounded-lg px-3 py-2 text-center font-medium text-white ${
                dark ? 'bg-cyan-700' : 'bg-brand-600'
              }`}
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
