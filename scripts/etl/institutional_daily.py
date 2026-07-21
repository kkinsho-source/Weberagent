#!/usr/bin/env python3
"""
三大法人日快取（TWSE T86 + 櫃買 3itrade）→ lib/data/institutional_snapshot.json

只保留 core_universe 代號；net_shares = 三大法人買賣超股數合計。
金額換算在 Next 端用最新收盤估算（與常見盤後工具相同近似）。

用法：
  python3 scripts/etl/institutional_daily.py
  python3 scripts/etl/institutional_daily.py --days 25
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import httpx

REPO = Path(__file__).resolve().parents[2]
CORE_PATH = REPO / "lib" / "data" / "core_universe.json"
OUT_PATH = REPO / "lib" / "data" / "institutional_snapshot.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; aistockmap-etl/0.1)",
    "Accept": "application/json",
}


def load_core_symbols() -> set[str]:
    data = json.loads(CORE_PATH.read_text(encoding="utf-8"))
    return {s["symbol"] for s in data.get("stocks") or []}


def parse_int(s: str | int | float | None) -> int:
    if s is None:
        return 0
    if isinstance(s, (int, float)):
        return int(s)
    t = str(s).strip().replace(",", "").replace("+", "")
    if t in ("", "-", "X", "null"):
        return 0
    try:
        return int(float(t))
    except ValueError:
        return 0


def candidate_dates(n: int) -> list[date]:
    """往回找日曆日（含假日）；實際有資料的才寫入。"""
    out: list[date] = []
    d = date.today()
    # 多抓一些日曆日以覆蓋假日
    for _ in range(n * 3 + 10):
        out.append(d)
        d -= timedelta(days=1)
        if len(out) >= n * 3 + 5:
            break
    return out


def fetch_twse_t86(client: httpx.Client, d: date) -> dict[str, dict]:
    ymd = d.strftime("%Y%m%d")
    url = (
        "https://www.twse.com.tw/rwd/zh/fund/T86"
        f"?response=json&date={ymd}&selectType=ALLBUT0999"
    )
    r = client.get(url, headers={**HEADERS, "Referer": "https://www.twse.com.tw/"}, timeout=60)
    r.raise_for_status()
    js = r.json()
    if js.get("stat") != "OK":
        return {}
    fields = js.get("fields") or []
    # 找「三大法人買賣超股數」欄
    try:
        idx_code = fields.index("證券代號")
        idx_name = fields.index("證券名稱")
        idx_net = fields.index("三大法人買賣超股數")
    except ValueError:
        # fallback last col often total
        idx_code, idx_name, idx_net = 0, 1, -1
    rows = {}
    for row in js.get("data") or []:
        if not row:
            continue
        code = str(row[idx_code]).strip()
        name = str(row[idx_name]).strip() if idx_name < len(row) else code
        net = parse_int(row[idx_net] if idx_net != -1 else row[-1])
        rows[code] = {"name": name, "netShares": net, "market": "twse"}
    return rows


def roc_path_date(d: date) -> str:
    """115/07/21"""
    return f"{d.year - 1911}/{d.month:02d}/{d.day:02d}"


def fetch_tpex_3insti(client: httpx.Client, d: date) -> dict[str, dict]:
    rd = roc_path_date(d)
    url = (
        "https://www.tpex.org.tw/web/stock/3insti/daily_trade/3itrade_hedge_result.php"
        f"?l=zh-tw&se=EW&t=D&d={rd}"
    )
    r = client.get(
        url,
        headers={**HEADERS, "Referer": "https://www.tpex.org.tw/"},
        timeout=60,
    )
    r.raise_for_status()
    js = r.json()
    tables = js.get("tables") or []
    if not tables:
        return {}
    table = tables[0]
    data = table.get("data") or []
    # 欄位很多；最後一欄常是三大法人買賣超股數合計
    rows = {}
    for row in data:
        if not row or len(row) < 3:
            continue
        code = str(row[0]).strip()
        name = str(row[1]).strip()
        net = parse_int(row[-1])
        rows[code] = {"name": name, "netShares": net, "market": "tpex"}
    return rows


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=25, help="目標交易日天數（預設 25）")
    args = ap.parse_args()
    core = load_core_symbols()
    print(f"[inst] core symbols={len(core)} target_days={args.days}", file=sys.stderr)

    by_symbol: dict[str, list[dict]] = {s: [] for s in core}
    days_ok: list[str] = []
    sources_note: list[str] = []

    with httpx.Client(follow_redirects=True) as client:
        for d in candidate_dates(args.days):
            if len(days_ok) >= args.days:
                break
            try:
                tw = fetch_twse_t86(client, d)
            except Exception as e:
                print(f"[inst] TWSE fail {d}: {e}", file=sys.stderr)
                tw = {}
            try:
                tx = fetch_tpex_3insti(client, d)
            except Exception as e:
                print(f"[inst] TPEx fail {d}: {e}", file=sys.stderr)
                tx = {}

            if not tw and not tx:
                continue

            iso = d.isoformat()
            hit = 0
            merged = {**tx, **tw}  # twse override same code if any
            for code, row in merged.items():
                if code not in core:
                    continue
                by_symbol[code].append(
                    {
                        "date": iso,
                        "netShares": row["netShares"],
                    }
                )
                hit += 1
            if hit == 0:
                continue
            days_ok.append(iso)
            print(f"[inst] {iso} core_hits={hit} twse={len(tw)} tpex={len(tx)}", file=sys.stderr)
            sources_note.append(iso)
            time.sleep(0.35)  # 溫和節流

    # sort each series
    for code in by_symbol:
        by_symbol[code].sort(key=lambda x: x["date"])

    # drop empty
    by_symbol = {k: v for k, v in by_symbol.items() if v}

    snap = {
        "asOf": days_ok[0] if days_ok else date.today().isoformat(),
        "days": days_ok,
        "dayCount": len(days_ok),
        "symbolCount": len(by_symbol),
        "source": "TWSE T86 + TPEx 3itrade_hedge",
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "bySymbol": by_symbol,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(snap, ensure_ascii=False), encoding="utf-8")
    print(
        f"[inst] wrote {OUT_PATH} days={snap['dayCount']} symbols={snap['symbolCount']}",
        file=sys.stderr,
    )
    return 0 if snap["dayCount"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
