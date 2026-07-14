import { NextResponse } from 'next/server';
import { fetchTwseDailyAll, buildUpsertRows } from '@/lib/etl/twse';
import { withRetry } from '@/lib/etl/retry';
import { upsertStockData, writeEtlLog } from '@/lib/data/upsert';
import { isSupabaseAdminConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET|POST /api/cron/twse-daily
 *
 * 每日收盤後 cron（台灣 17:30 = UTC 09:30，週一～五）
 * 流程：TWSE 抓取（含重試）→ upsert stocks/stock_prices → etl_logs
 *
 * 安全：
 * - Production：Authorization: Bearer <CRON_SECRET> 或 x-cron-secret
 * - 本機未設 CRON_SECRET：僅 localhost
 *
 * Query:
 * - coreOnly=0  全市場（預設核心 20 檔）
 * - dryRun=1    只抓不寫 DB（測試用）
 */
function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    const host = req.headers.get('host') || '';
    return host.startsWith('localhost') || host.startsWith('127.0.0.1');
  }
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const hdr = req.headers.get('x-cron-secret') || '';
  return bearer === secret || hdr === secret;
}

async function run(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const coreOnly = searchParams.get('coreOnly') !== '0';
  const dryRun = searchParams.get('dryRun') === '1';
  const started = Date.now();

  if (!dryRun && !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_service_role',
        message: '需要 SUPABASE_SERVICE_ROLE_KEY',
      },
      { status: 503 }
    );
  }

  await writeEtlLog({
    jobName: 'twse_daily_cron',
    status: 'started',
    source: 'TWSE STOCK_DAY_ALL',
    message: dryRun ? 'cron dryRun started' : 'cron started',
    meta: { coreOnly, dryRun },
  }).catch(() => {
    /* dryRun / 未設 DB 時略過 */
  });

  try {
    // 1) 抓 TWSE（最多 3 次重試）
    const fetched = await withRetry(() => fetchTwseDailyAll(), {
      retries: 3,
      baseMs: 1000,
      label: 'fetchTwseDailyAll',
    });

    const rows = buildUpsertRows(fetched, { coreOnly });
    if (rows.length === 0) {
      const msg = 'no rows after filter (TWSE empty or core symbols missing)';
      await writeEtlLog({
        jobName: 'twse_daily_cron',
        status: 'failed',
        source: fetched.source,
        recordsCount: 0,
        message: msg,
        meta: { asOf: fetched.asOf, marketCount: fetched.count, coreOnly, dryRun },
      }).catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'no_rows', asOf: fetched.asOf, marketCount: fetched.count },
        { status: 502 }
      );
    }

    if (dryRun) {
      const sample = rows
        .filter((r) => ['2330', '2317', '2454'].includes(r.symbol))
        .map((r) => ({ symbol: r.symbol, price: r.price, changePct: r.changePct }));
      return NextResponse.json({
        ok: true,
        dryRun: true,
        asOf: fetched.asOf,
        marketCount: fetched.count,
        wouldUpsert: rows.length,
        sample,
        ms: Date.now() - started,
      });
    }

    // 2) 寫入 Supabase（最多 3 次重試）
    const result = await withRetry(
      async () => {
        const r = await upsertStockData(rows, {
          writePrices: true,
          source: fetched.source,
        });
        if (!r.ok) throw new Error(r.error || 'upsert failed');
        return r;
      },
      { retries: 3, baseMs: 1200, label: 'upsertStockData' }
    );

    const ms = Date.now() - started;
    await writeEtlLog({
      jobName: 'twse_daily_cron',
      status: 'success',
      source: fetched.source,
      recordsCount: result.stocks,
      message: `cron ok stocks=${result.stocks} prices=${result.prices} asOf=${fetched.asOf} ${ms}ms`,
      meta: {
        asOf: fetched.asOf,
        marketCount: fetched.count,
        stocks: result.stocks,
        prices: result.prices,
        coreOnly,
        ms,
        retries: true,
      },
    });

    return NextResponse.json({
      ok: true,
      asOf: fetched.asOf,
      marketCount: fetched.count,
      stocks: result.stocks,
      prices: result.prices,
      coreOnly,
      ms,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeEtlLog({
      jobName: 'twse_daily_cron',
      status: 'failed',
      source: 'TWSE STOCK_DAY_ALL',
      message: msg,
      meta: { coreOnly, dryRun, ms: Date.now() - started },
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
