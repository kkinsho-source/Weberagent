import Link from 'next/link';
import { getDataBundle } from '@/lib/data/source';
import { fetchRecentEtlLogs } from '@/lib/data/supabase-repo';
import { isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '系統狀態',
  description: 'ETL / 資料健康檢查',
};

export default async function StatusPage() {
  const configured = isSupabaseConfigured();
  const [bundle, logs] = await Promise.all([
    getDataBundle(),
    configured ? fetchRecentEtlLogs(15) : Promise.resolve([]),
  ]);

  const lastOk = logs.find((l) => l.status === 'success');
  const lastFail = logs.find((l) => l.status === 'failed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">系統狀態</h1>
        <p className="mt-1 text-sm text-slate-500">
          資料源與 ETL 最近執行紀錄（公開檢視，便於除錯）。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card title="資料源" value={bundle.dataSource} sub={`${bundle.stocks.length} 檔核心股`} />
        <Card
          title="Supabase"
          value={configured ? '已設定' : '未設定'}
          sub={lastOk ? `最近成功：${lastOk.job_name}` : '尚無成功 log'}
        />
        <Card
          title="題材 / 邊"
          value={`${bundle.themes.length} / ${bundle.supplyEdges.length}`}
          sub={bundle.meta?.asOf ? `asOf ${bundle.meta.asOf}` : '—'}
        />
      </div>

      {lastFail && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          最近失敗：{lastFail.job_name} — {lastFail.message || 'no message'}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">時間</th>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">筆數</th>
              <th className="px-3 py-2">訊息</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  尚無 etl_logs（或未連 Supabase）
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">
                  {l.started_at ? new Date(l.started_at).toLocaleString('zh-TW') : '—'}
                </td>
                <td className="px-3 py-2 font-medium">{l.job_name}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      l.status === 'success'
                        ? 'text-up'
                        : l.status === 'failed'
                          ? 'text-down'
                          : 'text-slate-500'
                    }
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">{l.records_count ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500 max-w-md truncate">
                  {l.message || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        API：
        <Link href="/api/v1/health/supabase" className="text-brand-600 hover:underline">
          /api/v1/health/supabase
        </Link>
        {' · '}
        <Link href="/api/etl-logs" className="text-brand-600 hover:underline">
          /api/etl-logs
        </Link>
      </p>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}
