import Link from 'next/link';
import { AuthNav } from '@/components/auth/AuthNav';

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🧭</span>
          <span className="text-lg font-bold text-slate-800">AI 智慧產業地圖</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-slate-600">
          <Link href="/" className="hover:text-brand-600">
            首頁
          </Link>
          <Link href="/themes" className="hover:text-brand-600">
            題材
          </Link>
          <Link href="/favorites" className="hover:text-brand-600">
            自選
          </Link>
          <AuthNav />
          <Link
            href="/pricing"
            className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
          >
            升級
          </Link>
        </nav>
      </div>
    </header>
  );
}
