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
    <header className="sticky top-0 z-50 border-b border-fuchsia-400/25 bg-[#120814]/85 text-fuchsia-50 shadow-[0_0_28px_rgba(232,121,249,0.22)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-3 sm:py-3">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2">
          <span className="shrink-0 text-xl">🧭</span>
          <span className="hidden truncate font-cyber text-base font-bold text-fuchsia-100 sm:inline sm:text-lg">
            {SITE_NAME}
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <StockSearch tone="dark" />
        </div>

        <nav className="ml-1 hidden items-center gap-4 font-cyber text-xs text-fuchsia-200/70 lg:flex">
          {links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'font-semibold text-fuchsia-200'
                    : 'hover:text-fuchsia-100'
                }
              >
                {l.label}
              </Link>
            );
          })}
          <AuthNav />
          <Link
            href="/pricing"
            className="rounded-2xl bg-fuchsia-500 px-3 py-1.5 font-medium text-[#120814] shadow-[0_0_18px_rgba(232,121,249,0.55)] hover:bg-fuchsia-400"
          >
            升級
          </Link>
        </nav>

        <button
          type="button"
          className="shrink-0 rounded-2xl border border-fuchsia-400/30 px-2.5 py-1.5 text-sm text-fuchsia-100 lg:hidden"
          aria-expanded={open}
          aria-label="選單"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '關閉' : '選單'}
        </button>
      </div>

      {open && (
        <div className="border-t border-fuchsia-400/15 bg-[#120814] px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-2 font-cyber text-sm text-fuchsia-100">
            {links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-2xl px-2 py-2 ${
                    active
                      ? 'bg-fuchsia-500/15 font-semibold text-fuchsia-100'
                      : 'hover:bg-white/5'
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
              className="rounded-2xl bg-fuchsia-500 px-3 py-2 text-center font-medium text-[#120814]"
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
