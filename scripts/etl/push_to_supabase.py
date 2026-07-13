#!/usr/bin/env python3
"""
把 lib/data/twse_snapshot.json 的真實行情 upsert 進 Supabase stocks，
並寫入 etl_logs。

必要環境變數：
  NEXT_PUBLIC_SUPABASE_URL   或 SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  （service_role，可寫入並繞過 RLS）

用法：
  # 先抓行情
  python3 scripts/etl/twse_daily.py
  # 推到 Supabase
  python3 scripts/etl/push_to_supabase.py
  # 或 dry-run（不打 API，只驗證 payload）
  python3 scripts/etl/push_to_supabase.py --dry-run
  # 只更新核心 20 檔（預設）
  python3 scripts/etl/push_to_supabase.py --core-only
  # 全市場（1369 檔）
  python3 scripts/etl/push_to_supabase.py --all
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = REPO_ROOT / "lib" / "data" / "twse_snapshot.json"
MOCK_CORE_SYMBOLS = {
    "3443", "3661", "3035", "6643", "6533",
    "2454", "2379", "5274", "2330", "2303",
    "3711", "2449", "6257", "2317", "2382",
    "6669", "4958", "3037", "8046", "2383",
}


def load_env_file(path: Path) -> None:
    """簡易讀取 .env.local（不覆蓋已存在的環境變數）"""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def get_config() -> tuple[str, str]:
    load_env_file(REPO_ROOT / ".env.local")
    load_env_file(REPO_ROOT / ".env")
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or ""
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    return url.rstrip("/"), key


def load_snapshot() -> dict:
    if not SNAPSHOT_PATH.exists():
        raise FileNotFoundError(
            f"找不到 {SNAPSHOT_PATH}，請先跑 python3 scripts/etl/twse_daily.py"
        )
    return json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))


def build_rows(snapshot: dict, core_only: bool) -> list[dict]:
    as_of = snapshot.get("asOf")
    quotes = snapshot.get("quotes") or {}
    rows = []
    for symbol, q in quotes.items():
        if core_only and symbol not in MOCK_CORE_SYMBOLS:
            continue
        rows.append(
            {
                "symbol": symbol,
                "market": "tw",
                "name": q.get("name") or symbol,
                "price": q.get("price"),
                "change_pct": q.get("changePct"),
                "as_of": as_of,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    return rows


def rest_upsert(url: str, key: str, rows: list[dict]) -> int:
    """PostgREST upsert：on_conflict=symbol,market"""
    endpoint = f"{url}/rest/v1/stocks?on_conflict=symbol,market"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    # 分批，避免 payload 過大
    batch = 200
    total = 0
    with httpx.Client(timeout=60.0) as client:
        for i in range(0, len(rows), batch):
            chunk = rows[i : i + batch]
            r = client.post(endpoint, headers=headers, json=chunk)
            if r.status_code >= 400:
                raise RuntimeError(f"upsert failed HTTP {r.status_code}: {r.text[:500]}")
            total += len(chunk)
            print(f"[push] upserted {total}/{len(rows)}", file=sys.stderr)
    return total


def write_etl_log(
    url: str,
    key: str,
    *,
    status: str,
    records: int,
    message: str,
    source: str,
    meta: dict,
) -> None:
    endpoint = f"{url}/rest/v1/etl_logs"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    body = {
        "job_name": "twse_daily_push",
        "status": status,
        "source": source,
        "records_count": records,
        "message": message,
        "meta": meta,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }
    with httpx.Client(timeout=30.0) as client:
        r = client.post(endpoint, headers=headers, json=body)
        if r.status_code >= 400:
            print(f"[push] warn: etl_logs write failed: {r.status_code} {r.text[:200]}", file=sys.stderr)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只產生 payload，不連線")
    ap.add_argument("--core-only", action="store_true", default=True, help="只更新核心 20 檔（預設）")
    ap.add_argument("--all", action="store_true", help="更新全市場")
    args = ap.parse_args()
    core_only = not args.all

    snapshot = load_snapshot()
    rows = build_rows(snapshot, core_only=core_only)
    print(
        f"[push] snapshot asOf={snapshot.get('asOf')} rows={len(rows)} core_only={core_only}",
        file=sys.stderr,
    )

    if args.dry_run:
        sample = [r for r in rows if r["symbol"] in ("2330", "2317", "2454")]
        print(json.dumps({"count": len(rows), "sample": sample}, ensure_ascii=False, indent=2))
        print("[push] dry-run OK（未連線 Supabase）", file=sys.stderr)
        return 0

    url, key = get_config()
    if not url or not key:
        print(
            "[push] ERROR: 缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY\n"
            "  請在 .env.local 設定後重跑，或：\n"
            "  export NEXT_PUBLIC_SUPABASE_URL=...\n"
            "  export SUPABASE_SERVICE_ROLE_KEY=...",
            file=sys.stderr,
        )
        return 2

    try:
        n = rest_upsert(url, key, rows)
        write_etl_log(
            url,
            key,
            status="success",
            records=n,
            message=f"upserted {n} stocks from snapshot",
            source=snapshot.get("source", "TWSE"),
            meta={"asOf": snapshot.get("asOf"), "coreOnly": core_only},
        )
        print(f"[push] SUCCESS: {n} stocks → Supabase", file=sys.stderr)
        return 0
    except Exception as e:
        print(f"[push] ERROR: {e}", file=sys.stderr)
        try:
            write_etl_log(
                url,
                key,
                status="failed",
                records=0,
                message=str(e)[:500],
                source=snapshot.get("source", "TWSE"),
                meta={"asOf": snapshot.get("asOf")},
            )
        except Exception:
            pass
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
