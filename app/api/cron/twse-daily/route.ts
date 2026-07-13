import { NextResponse } from 'next/server';
import { fetchTwseDailyAll, buildUpsertRows } from '@/lib/etl/twse';
import { upsertStockData, writeEtlLog } from '@/lib/data/upsert';
import { isSupabaseAdminConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel serverless 上限（Pro 可更高）

/**
 * GET|POST /api/cron/twse-daily
 *
 * 每日收盤後 cron：抓 TWSE → upsert stocks + stock_prices → etl_logs
 *
 * 安全：
 * - Vercel Cron 會帶 Authorization: Bearer <CRON_SECRET>
 * - 手動測試：Header `Authorization: Bearer <CRON_SECRET>` 或 `x-cron-secret: <CRON_SECRET>`
 *
 * Query:
 * - coreOnly=0  全市場（預設 1 = 核心 20 檔）
 */
function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // 未設 secret 時：僅允許本機開發
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
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_service_role',
        message: '需要 SUPABASE_SERVICE_ROLE_KEY',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const coreOnly = searchParams.get('coreOnly') !== '0';
  const started = Date.now();

  await writeEtlLog({
    jobName: 'twse_daily_cron',
    status: 'started',
    source: 'TWSE STOCK_DAY_ALL',
    message: 'cron started',
    meta: { coreOnly },
  });

  try {
    const fetched = await fetchTwseDailyAll();
    const rows = buildUpsertRows(fetched, { coreOnly });
    if (rows.length === 0) {
      await writeEtlLog({
        jobName: 'twse_daily_cron',
        status: 'failed',
        source: fetched.source,
        recordsCount: 0,
        message: 'no rows after filter (TWSE empty or core symbols missing)',
        meta: { asOf: fetched.asOf, marketCount: fetched.count, coreOnly },
      });
      return NextResponse.json(
        {
          ok: false,
          error: 'no_rows',
          asOf: fetched.asOf,
          marketCount: fetched.count,
        },
        { status: 502 }
      );
    }

    const result = await upsertStockData(rows, {
      writePrices: true,
      source: fetched.source,
    });

    const ms = Date.now() - started;
    if (!result.ok) {
      await writeEtlLog({
        jobName: 'twse_daily_cron',
        status: 'failed',
        source: fetched.source,
        recordsCount: 0,
        message: result.error,
        meta: { asOf: fetched.asOf, coreOnly, ms },
      });
      return NextResponse.json(
        { ok: false, error: result.error, asOf: fetched.asOf },
        { status: 500 }
      );
    }

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
    });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
