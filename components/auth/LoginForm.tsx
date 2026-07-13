'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';

export function LoginForm() {
  const { configured, signIn, signUp, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        已登入為 <strong>{user.email}</strong>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
            onClick={() => router.push('/favorites')}
          >
            查看自選股
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-white"
            onClick={() => router.push('/')}
          >
            回首頁
          </button>
        </div>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const r = await signIn(email, password);
        if (r.error) setErr(r.error);
        else {
          setMsg('登入成功');
          router.push('/favorites');
          router.refresh();
        }
      } else {
        const r = await signUp(email, password);
        if (r.error) setErr(r.error);
        else if (r.needsConfirm) {
          setMsg('註冊成功！請至信箱點擊確認連結後再登入（若專案關閉 email confirm 則可直接登入）。');
        } else {
          setMsg('註冊並登入成功');
          router.push('/favorites');
          router.refresh();
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {!configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Supabase 尚未設定。</strong> 請在 <code>.env.local</code> 填入
          NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 後重啟 dev server。未設定前仍可使用本機「本地自選」示範。
        </div>
      )}

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 ${mode === 'login' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          onClick={() => setMode('login')}
        >
          登入
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 ${mode === 'signup' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          onClick={() => setMode('signup')}
        >
          註冊
        </button>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <input
          type="email"
          required
          autoComplete="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder="密碼（至少 6 碼）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !configured}
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? '處理中…' : mode === 'login' ? '登入' : '建立帳號'}
        </button>
      </form>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}

      <p className="text-[11px] text-slate-400">
        使用 Supabase Auth（Email/Password）。登入後可把個股加入自選（favorites 表 + RLS）。
      </p>
    </div>
  );
}
