#!/usr/bin/env python3
"""
TWSE 每日行情 ETL（Phase 2 資料管線骨架）

功能：
  - 抓取證交所公開 OpenAPI「每日收盤資訊」(STOCK_DAY_ALL)
  - 解析為 { symbol, name, price, changePct }，並計算漲跌幅
  - 輸出 JSON snapshot 到 lib/data/twse_snapshot.json

設計原則：
  - 本腳本「只負責抓真實行情」，不碰 domain 分類（題材/產業/供應鏈）。
    分類由前端 mock 層提供，source.ts 再把真實報價合併上去。
  - 上 Supabase 後，本腳本改為 upsert 進 Postgres（schema.sql 已備好）。
  - 遵守證交所使用規範：加 UA、單次請求、失敗即報錯不 silently 造假。

用法：
  python3 scripts/etl/twse_daily.py            # 抓全市場，寫入 snapshot
  python3 scripts/etl/twse_daily.py --symbols 2330,2317   # 只抓指定（除錯用）
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

import httpx

# 證交所 OpenAPI 端點（公開、無需授權；商業化前請確認授權規範）
TWSE_STOCK_DAY_ALL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"

# snapshot 輸出位置：相對於 repo 根目錄
REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = REPO_ROOT / "lib" / "data" / "twse_snapshot.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; aistockmap-etl/0.1)",
    "Accept": "application/json",
}


def roc_date_to_iso(roc: str) -> str:
    """ROC 民國年日期 '1150709' -> '2026-07-09'。"""
    if not roc or len(roc) != 7:
        return date.today().isoformat()
    y = int(roc[:3]) + 1911
    m = int(roc[3:5])
    d = int(roc[5:7])
    return date(y, m, d).isoformat()


def parse_num(s: str) -> float:
    """證交所數值可能帶千分位逗號或為 '-'/''（停牌）。"""
    if s is None:
        return 0.0
    s = s.strip().replace(",", "").replace("+", "")
    if s in ("", "-", "X", " "):
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


def fetch_snapshot(only_symbols: set[str] | None = None) -> dict:
    """抓取並解析全市場每日行情，回傳 snapshot dict。"""
    print(f"[etl] GET {TWSE_STOCK_DAY_ALL} ...", file=sys.stderr)
    resp = httpx.get(TWSE_STOCK_DAY_ALL, headers=HEADERS, timeout=60.0)
    resp.raise_for_status()
    rows = resp.json()
    print(f"[etl] 收到 {len(rows)} 檔", file=sys.stderr)

    quotes: dict[str, dict] = {}
    as_of = date.today().isoformat()
    for r in rows:
        code = (r.get("Code") or "").strip()
        if not code:
            continue
        if only_symbols and code not in only_symbols:
            continue
        close = parse_num(r.get("ClosingPrice"))
        change = parse_num(r.get("Change"))
        # 漲跌幅 = 漲跌 / 昨收；昨收 = 收盤 - 漲跌
        prev_close = close - change
        change_pct = (change / prev_close * 100.0) if prev_close else 0.0
        quotes[code] = {
            "name": (r.get("Name") or "").strip(),
            "price": close,
            "changePct": round(change_pct, 2),
        }
        as_of = roc_date_to_iso(r.get("Date", ""))

    snapshot = {
        "asOf": as_of,
        "source": "TWSE STOCK_DAY_ALL",
        "count": len(quotes),
        "quotes": quotes,
    }
    return snapshot


def main() -> int:
    ap = argparse.ArgumentParser(description="TWSE 每日行情 ETL")
    ap.add_argument("--symbols", help="只抓指定代號，逗號分隔（除錯用）", default="")
    args = ap.parse_args()
    only = {s.strip() for s in args.symbols.split(",") if s.strip()} or None

    try:
        snapshot = fetch_snapshot(only)
    except httpx.HTTPError as e:
        print(f"[etl] ERROR: 抓取證交所失敗: {e}", file=sys.stderr)
        return 1

    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_PATH.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"[etl] 已寫入 {SNAPSHOT_PATH} | asOf={snapshot['asOf']} | {snapshot['count']} 檔",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
