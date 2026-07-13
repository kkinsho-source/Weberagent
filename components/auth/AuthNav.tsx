'use client';

import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';

export function AuthNav() {
  const { configured, user, loading, signOut } = useAuth();

  if (loading) {
    return <span className="text-xs text-slate-400">…</span>;
  }

  if (!configured) {
    return (
      <Link href="/login" className="hover:text-brand-600" title="請先設定 Supabase env">
        登入
      </Link>
    );
  }

  if (!user) {
    return (
      <Link href="/login" className="hover:text-brand-600">
        登入
      </Link>
    );
  }

  const label = user.email?.split('@')[0] ?? '會員';
  return (
    <div className="flex items-center gap-3">
      <Link href="/favorites" className="hover:text-brand-600">
        自選
      </Link>
      <span className="hidden text-xs text-slate-500 sm:inline" title={user.email ?? ''}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-xs text-slate-500 hover:text-brand-600"
      >
        登出
      </button>
    </div>
  );
}
