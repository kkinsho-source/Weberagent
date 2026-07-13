import { LoginForm } from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-xl font-bold text-slate-800">登入 / 註冊</h1>
      <p className="mt-2 text-sm text-slate-500">
        登入後可雲端同步自選股。尚未設定 Supabase 時可先用本機自選示範。
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">
        <Link href="/favorites" className="text-brand-600 hover:underline">
          查看自選股 →
        </Link>
      </p>
    </div>
  );
}
