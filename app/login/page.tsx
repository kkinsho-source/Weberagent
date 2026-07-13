export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-xl font-bold text-slate-800">登入</h1>
      <p className="mt-2 text-sm text-slate-500">
        登入以查看完整產業地圖與分析（預留 Supabase Auth）。
      </p>
      <form className="mt-6 space-y-3">
        <input
          type="email"
          placeholder="email@example.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <input
          type="password"
          placeholder="密碼"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          className="w-full rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          登入
        </button>
      </form>
    </div>
  );
}
