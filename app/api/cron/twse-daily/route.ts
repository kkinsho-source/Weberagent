import { NextResponse } from 'next/server';
import { fetchTwseDailyAll, buildUpsertRows } from '@/lib/etl/twse';
import { fillMissingQuotes } from '@/lib/etl/tpex';
import { fetchMopsDailyOpenapi, upsertMopsRows } from '@/lib/etl/mops';
import { withRetry } from '@/lib/etl/retry';
import { upsertStockData, writeEtlLog } from '@/lib/data/upsert';
import { stocks as mockStocks } from '@/lib/data/mock';
import { isSupabaseAdminConfigured } from '@/lib/supabase';
import type { StockUpsertInput } from '@/lib/data/upsert';
import type { TwseQuote } from '@/lib/etl/twse';
import type { Stock } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET|POST /api/cron/twse-daily
 * 台灣平日 17:30：TWSE + 櫃買補價 + MOPS → Supabase
 *
 * Query: coreOnly=0 | dryRun=1 | skipMops=1
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
  const skipMops = searchParams.get('skipMops') === '1';
  const started = Date.now();

  if (!dryRun && !isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'missing_service_role', message: '需要 SUPABASE_SERVICE_ROLE_KEY' },
      { status: 503 }
    );
  }

  await writeEtlLog({
    jobName: 'twse_daily_cron',
    status: 'started',
    source: 'TWSE+TPEX+MOPS',
    message: dryRun ? 'cron dryRun started' : 'cron started',
    meta: { coreOnly, dryRun, skipMops },
  }).catch(() => {});

  try {
    // 1) TWSE 上市日行情
    const fetched = await withRetry(() => fetchTwseDailyAll(), {
      retries: 3,
      baseMs: 1000,
      label: 'fetchTwseDailyAll',
    });

    let rows = buildUpsertRows(fetched, { coreOnly });

    // 2) 核心檔缺價 → 櫃買 / Yahoo 補
    const coreSymbols = mockStocks.map((s) => s.symbol);
    const have = new Set(rows.map((r) => r.symbol));
    const missing = coreOnly
      ? coreSymbols.filter((s) => !have.has(s))
      : [];
    let otcFilled = 0;
    let otcSource = '';
    if (missing.length) {
      const filled = await withRetry(
        () => fillMissingQuotes(missing, fetched.asOf),
        { retries: 2, baseMs: 800, label: 'fillMissingQuotes' }
      );
      otcSource = filled.source;
      const mockMap = new Map<string, Stock>(mockStocks.map((s) => [s.symbol, s]));
      for (const [symbol, q] of Object.entries(filled.quotes) as [string, TwseQuote][]) {
        const m = mockMap.get(symbol);
        const row: StockUpsertInput = {
          symbol,
          market: 'tw',
          name: q.name || m?.name || symbol,
          industry: m?.industry,
          themeSlug: m?.themeSlug,
          price: q.price,
          changePct: q.changePct,
          marketCap: m?.marketCap,
          asOf: filled.asOf || fetched.asOf,
          open: q.open,
          high: q.high,
          low: q.low,
          volume: q.volume,
        };
        rows.push(row);
        otcFilled++;
      }
    }

    // 3) MOPS 日更
    let mopsCount = 0;
    let mopsError: string | undefined;
    if (!skipMops && !dryRun) {
      try {
        const mopsRows = await withRetry(() => fetchMopsDailyOpenapi(), {
          retries: 2,
          baseMs: 800,
          label: 'fetchMopsDaily',
        });
        const mopsRes = await upsertMopsRows(mopsRows);
        if (mopsRes.ok) {
          mopsCount = mopsRes.count;
          await writeEtlLog({
            jobName: 'mops_daily_cron',
            status: 'success',
            source: 'openapi_t187ap04_L',
            recordsCount: mopsCount,
            message: `mops upserted ${mopsCount}`,
          });
        } else {
          mopsError = mopsRes.error;
          await writeEtlLog({
            jobName: 'mops_daily_cron',
            status: 'failed',
            source: 'openapi_t187ap04_L',
            message: mopsRes.error,
          });
        }
      } catch (e) {
        mopsError = e instanceof Error ? e.message : String(e);
        await writeEtlLog({
          jobName: 'mops_daily_cron',
          status: 'failed',
          source: 'openapi_t187ap04_L',
          message: mopsError,
        }).catch(() => {});
      }
    }

    if (rows.length === 0) {
      await writeEtlLog({
        jobName: 'twse_daily_cron',
        status: 'failed',
        source: fetched.source,
        message: 'no rows',
        meta: { asOf: fetched.asOf, marketCount: fetched.count },
      }).catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'no_rows', asOf: fetched.asOf },
        { status: 502 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        asOf: fetched.asOf,
        marketCount: fetched.count,
        wouldUpsert: rows.length,
        otcFilled,
        otcSource,
        mopsSkipped: true,
        sample: rows
          .filter((r) => ['2330', '6643', '5274', '2317'].includes(r.symbol))
          .map((r) => ({ symbol: r.symbol, price: r.price, changePct: r.changePct })),
        ms: Date.now() - started,
      });
    }

    const result = await withRetry(
      async () => {
        const r = await upsertStockData(rows, {
          writePrices: true,
          source: otcFilled ? `${fetched.source}+${otcSource || 'OTC'}` : fetched.source,
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
      source: 'TWSE+TPEX+MOPS',
      recordsCount: result.stocks,
      message: `cron ok stocks=${result.stocks} prices=${result.prices} otc=${otcFilled} mops=${mopsCount} asOf=${fetched.asOf} ${ms}ms`,
      meta: {
        asOf: fetched.asOf,
        marketCount: fetched.count,
        stocks: result.stocks,
        prices: result.prices,
        otcFilled,
        otcSource,
        mopsCount,
        mopsError,
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
      otcFilled,
      otcSource,
      mopsCount,
      mopsError,
      coreOnly,
      ms,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await writeEtlLog({
      jobName: 'twse_daily_cron',
      status: 'failed',
      source: 'TWSE+TPEX+MOPS',
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
