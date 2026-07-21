#!/usr/bin/env python3
"""把 lib/data/institutional_snapshot.json 灌進 Supabase stock_institutional_daily（一次性／可重跑）"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parents[2]
SNAP = REPO / "lib" / "data" / "institutional_snapshot.json"


def load_env(path: Path) -> None:
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


def main() -> int:
    load_env(REPO / ".env.local")
    load_env(REPO / ".env")
    url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip(
        "/"
    )
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        print("[inst-push] missing supabase env", file=sys.stderr)
        return 2
    if not SNAP.exists():
        print(f"[inst-push] missing {SNAP}", file=sys.stderr)
        return 1

    snap = json.loads(SNAP.read_text(encoding="utf-8"))
    by = snap.get("bySymbol") or {}
    rows = []
    for sym, series in by.items():
        for p in series:
            rows.append(
                {
                    "symbol": sym,
                    "market": "tw",
                    "trade_date": p["date"],
                    "net_shares": int(p.get("netShares") or 0),
                    "source": snap.get("source") or "snapshot",
                }
            )
    print(f"[inst-push] rows={len(rows)} symbols={len(by)}", file=sys.stderr)
    if not rows:
        return 1

    endpoint = f"{url}/rest/v1/stock_institutional_daily?on_conflict=symbol,market,trade_date"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    total = 0
    with httpx.Client(timeout=120.0) as client:
        for i in range(0, len(rows), 300):
            chunk = rows[i : i + 300]
            r = client.post(endpoint, headers=headers, json=chunk)
            if r.status_code >= 400:
                print(f"[inst-push] FAIL {r.status_code} {r.text[:400]}", file=sys.stderr)
                return 1
            total += len(chunk)
            print(f"[inst-push] {total}/{len(rows)}", file=sys.stderr)
    print(f"[inst-push] SUCCESS {total}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
