import { NextResponse } from 'next/server';
import { migrateSnapshotToSupabase } from '@/lib/data/migrate';
import { isSupabaseAdminConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/migrate-snapshot
 * 把 twse_snapshot.json 寫入 Supabase stocks + stock_prices
 *
 * 安全：僅當設定了 SERVICE_ROLE 且（可選）MIGRATE_SECRET 相符時允許
 * Header: x-migrate-secret: <MIGRATE_SECRET>
 * 開發環境若未設 MIGRATE_SECRET 則放行（仍需 service role）
 */
export async function POST(req: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_service_role',
        message: '請在 .env.local 設定 SUPABASE_SERVICE_ROLE_KEY',
      },
      { status: 503 }
    );
  }

  const secret = process.env.MIGRATE_SECRET;
  if (secret) {
    const hdr = req.headers.get('x-migrate-secret');
    if (hdr !== secret) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const body = (await req.json().catch(() => ({}))) as { coreOnly?: boolean };
  const result = await migrateSnapshotToSupabase({
    coreOnly: body.coreOnly !== false,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/admin/migrate-snapshot',
    body: { coreOnly: true },
    headers: { 'x-migrate-secret': 'optional if MIGRATE_SECRET set' },
  });
}
