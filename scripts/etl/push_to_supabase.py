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
# 與 lib/data/mock.ts 核心股池同步
MOCK_CORE_SYMBOLS = {
    "3443", "3661", "3035", "6643", "6533",
    "2454", "2379", "5274", "2330", "2303", "6770",
    "3711", "2449", "6257", "3189", "6271",
    "2317", "2382", "6669", "3231", "2356",
    "4958", "3037", "8046", "2383", "6213",
    "2308", "3017", "3653", "3324", "6230",
    "4979", "3363", "3081", "4977",
    "6488", "3532", "6182",
    "2344", "2408", "2337", "8299",
}
# symbol -> (name, industry, theme_slug, market_cap)
MOCK_META = {
    "3443": ("創意", "IC 設計", "ic_design_asic", 1620),
    "3661": ("世芯-KY", "IC 設計", "ic_design_asic", 2100),
    "3035": ("智原", "IC 設計", "ic_design_asic", 380),
    "6643": ("M31", "IP", "ic_design_asic", 210),
    "6533": ("晶心科", "IP", "ic_design_asic", 520),
    "2454": ("聯發科", "IC 設計", "ic_design_hpc", 20000),
    "2379": ("瑞昱", "IC 設計", "ic_design_hpc", 2900),
    "5274": ("信驊", "IC 設計", "ic_design_hpc", 2400),
    "2330": ("台積電", "晶圓代工", "foundry", 306000),
    "2303": ("聯電", "晶圓代工", "foundry", 6600),
    "6770": ("力積電", "晶圓代工", "foundry", 900),
    "3711": ("日月光投控", "封測", "advanced_packaging", 7800),
    "2449": ("京元電", "封測", "advanced_packaging", 1650),
    "6257": ("矽格", "封測", "advanced_packaging", 720),
    "3189": ("景碩", "IC 載板", "advanced_packaging", 1600),
    "6271": ("同欣電", "封測", "advanced_packaging", 600),
    "2317": ("鴻海", "組裝", "ai_server", 30500),
    "2382": ("廣達", "組裝", "ai_server", 14800),
    "6669": ("緯穎", "組裝", "ai_server", 5200),
    "3231": ("緯創", "組裝", "ai_server", 4200),
    "2356": ("英業達", "組裝", "ai_server", 2000),
    "4958": ("臻鼎-KY", "PCB", "pcb_ccl", 2600),
    "3037": ("欣興", "PCB", "pcb_ccl", 2700),
    "8046": ("南電", "PCB", "pcb_ccl", 3900),
    "2383": ("台光電", "CCL", "pcb_ccl", 3100),
    "6213": ("聯茂", "CCL", "pcb_ccl", 800),
    "2308": ("台達電", "電源", "thermal_power", 11000),
    "3017": ("奇鋐", "散熱", "thermal_power", 2400),
    "3653": ("健策", "散熱", "thermal_power", 1100),
    "3324": ("雙鴻", "散熱", "thermal_power", 900),
    "6230": ("超眾", "散熱", "thermal_power", 400),
    "4979": ("華星光", "光通訊", "optical_cpo", 350),
    "3363": ("上詮", "光通訊", "optical_cpo", 200),
    "3081": ("聯亞", "光通訊", "optical_cpo", 450),
    "4977": ("眾達-KY", "光通訊", "optical_cpo", 280),
    "6488": ("環球晶", "矽晶圓", "materials_wafer", 2000),
    "3532": ("台勝科", "矽晶圓", "materials_wafer", 700),
    "6182": ("合晶", "矽晶圓", "materials_wafer", 250),
    "2344": ("華邦電", "記憶體", "memory_hbm", 1400),
    "2408": ("南亞科", "記憶體", "memory_hbm", 2200),
    "2337": ("旺宏", "記憶體", "memory_hbm", 500),
    "8299": ("群聯", "控制器", "memory_hbm", 1100),
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
        meta = MOCK_META.get(symbol)
        rows.append(
            {
                "symbol": symbol,
                "market": "tw",
                "name": (q.get("name") or (meta[0] if meta else symbol)),
                "industry": meta[1] if meta else None,
                "theme_slug": meta[2] if meta else None,
                "market_cap": meta[3] if meta else None,
                "price": q.get("price"),
                "change_pct": q.get("changePct"),
                "as_of": as_of,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )
    # core 股若 snapshot 缺報價，仍保留 theme meta（價格後續 cron 補）
    if core_only:
        have = {r["symbol"] for r in rows}
        for symbol, meta in MOCK_META.items():
            if symbol in have:
                continue
            rows.append(
                {
                    "symbol": symbol,
                    "market": "tw",
                    "name": meta[0],
                    "industry": meta[1],
                    "theme_slug": meta[2],
                    "market_cap": meta[3],
                    "price": None,
                    "change_pct": None,
                    "as_of": as_of,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
    return rows


def rest_upsert(url: str, key: str, rows: list[dict]) -> int:
    """PostgREST upsert stocks：on_conflict=symbol,market"""
    endpoint = f"{url}/rest/v1/stocks?on_conflict=symbol,market"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    batch = 200
    total = 0
    with httpx.Client(timeout=60.0) as client:
        for i in range(0, len(rows), batch):
            chunk = rows[i : i + batch]
            r = client.post(endpoint, headers=headers, json=chunk)
            if r.status_code >= 400:
                raise RuntimeError(f"upsert stocks failed HTTP {r.status_code}: {r.text[:500]}")
            total += len(chunk)
            print(f"[push] stocks upserted {total}/{len(rows)}", file=sys.stderr)
    return total


def rest_upsert_prices(url: str, key: str, rows: list[dict], as_of: str, source: str) -> int:
    """寫入 stock_prices 日線（close=最新收盤）"""
    if not as_of or not rows:
        return 0
    price_rows = [
        {
            "symbol": r["symbol"],
            "market": r.get("market") or "tw",
            "trade_date": as_of,
            "close": r.get("price"),
            "change_pct": r.get("change_pct"),
            "source": source,
        }
        for r in rows
        if r.get("price") is not None
    ]
    endpoint = f"{url}/rest/v1/stock_prices?on_conflict=symbol,market,trade_date"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    total = 0
    batch = 200
    with httpx.Client(timeout=60.0) as client:
        for i in range(0, len(price_rows), batch):
            chunk = price_rows[i : i + batch]
            r = client.post(endpoint, headers=headers, json=chunk)
            if r.status_code >= 400:
                # 表可能尚未建立 — 警告但不中斷 stocks 成功
                print(
                    f"[push] warn stock_prices upsert HTTP {r.status_code}: {r.text[:200]}",
                    file=sys.stderr,
                )
                return total
            total += len(chunk)
            print(f"[push] stock_prices upserted {total}/{len(price_rows)}", file=sys.stderr)
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
        pn = rest_upsert_prices(
            url,
            key,
            rows,
            as_of=str(snapshot.get("asOf") or ""),
            source=str(snapshot.get("source") or "TWSE"),
        )
        write_etl_log(
            url,
            key,
            status="success",
            records=n,
            message=f"upserted {n} stocks + {pn} stock_prices from snapshot",
            source=snapshot.get("source", "TWSE"),
            meta={"asOf": snapshot.get("asOf"), "coreOnly": core_only, "prices": pn},
        )
        print(f"[push] SUCCESS: {n} stocks, {pn} prices → Supabase", file=sys.stderr)
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
