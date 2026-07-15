#!/usr/bin/env python3
"""
MOPS / 證交所重大訊息 ETL

資料源（已實測）：
  A) 證交所 OpenAPI（官方、穩定）— 每日全市場重大訊息快照
     GET https://openapi.twse.com.tw/v1/opendata/t187ap04_L
     欄位：公司代號/名稱、發言日期時間、主旨、符合條款、事實發生日、說明

  B) MOPS 舊站 ajax（公司年度查詢）
     POST https://mopsov.twse.com.tw/mops/web/ajax_t05st01
     回傳 HTML table：公司代號/名稱、發言日期、發言時間、主旨
     注意：mops.twse.com.tw 新站常擋爬；請用 mopsov。

用法：
  python3 scripts/etl/mops_announcements.py --mode daily
  python3 scripts/etl/mops_announcements.py --mode company --symbol 2330
  python3 scripts/etl/mops_announcements.py --mode core
  python3 scripts/etl/mops_announcements.py --mode daily --push
  python3 scripts/etl/mops_announcements.py --mode daily --dry-run
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

REPO_ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = REPO_ROOT / "lib" / "data" / "mops_snapshot.json"
CORE_PATH = REPO_ROOT / "lib" / "data" / "core_universe.json"


def _load_core_symbols() -> list[str]:
    data = json.loads(CORE_PATH.read_text(encoding="utf-8"))
    return [s["symbol"] for s in (data.get("stocks") or [])]


# SSOT: lib/data/core_universe.json
CORE_SYMBOLS = _load_core_symbols()

OPENAPI_DAILY_L = "https://openapi.twse.com.tw/v1/opendata/t187ap04_L"
MOPSOV_AJAX = "https://mopsov.twse.com.tw/mops/web/ajax_t05st01"

UA = "Mozilla/5.0 (compatible; aistockmap-etl/0.2; +https://localhost)"


def load_env_file(path: Path) -> None:
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


def roc_to_iso(s: str) -> str | None:
    """ROC 日期 → ISO。支援 1150712 / 115/07/12 / 115-07-12。"""
    if not s:
        return None
    s = s.strip().replace("-", "/").replace(".", "/")
    m = re.fullmatch(r"(\d{2,3})/(\d{1,2})/(\d{1,2})", s)
    if m:
        y = int(m.group(1)) + 1911
        return f"{y:04d}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    digits = re.sub(r"\D", "", s)
    if len(digits) == 7:  # YYYMMDD
        y = int(digits[:3]) + 1911
        return f"{y:04d}-{digits[3:5]}-{digits[5:7]}"
    if len(digits) == 8:  # YYYYMMDD
        return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}"
    return None


def normalize_time(s: str) -> str:
    """70003 / 16:56:08 / 165608 → HH:MM:SS"""
    if not s:
        return ""
    s = s.strip()
    if re.fullmatch(r"\d{1,2}:\d{2}:\d{2}", s):
        parts = s.split(":")
        return f"{int(parts[0]):02d}:{parts[1]}:{parts[2]}"
    digits = re.sub(r"\D", "", s)
    if len(digits) <= 6:
        digits = digits.zfill(6)
        return f"{digits[0:2]}:{digits[2:4]}:{digits[4:6]}"
    return s


def clean_text(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"[\r\n\t]+", " ", s).strip()


def fingerprint(symbol: str, speak_date: str, speak_time: str, title: str) -> str:
    raw = f"{symbol}|{speak_date}|{speak_time}|{title}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def make_row(
    *,
    symbol: str,
    company_name: str,
    speak_date: str,
    speak_time: str,
    title: str,
    content: str = "",
    clause: str = "",
    event_date: str | None = None,
    source: str,
    raw: dict | None = None,
) -> dict | None:
    symbol = (symbol or "").strip()
    title = clean_text(title)
    if not symbol or not title or not speak_date:
        return None
    speak_time = normalize_time(speak_time)
    return {
        "symbol": symbol,
        "company_name": clean_text(company_name),
        "speak_date": speak_date,
        "speak_time": speak_time,
        "title": title,
        "content": clean_text(content) if content else "",
        "clause": clean_text(clause),
        "event_date": event_date,
        "market": "tw",
        "source": source,
        "fingerprint": fingerprint(symbol, speak_date, speak_time, title),
        "raw": raw or {},
    }


def fetch_daily_openapi(client: httpx.Client) -> list[dict]:
    print(f"[mops] GET {OPENAPI_DAILY_L}", file=sys.stderr)
    r = client.get(OPENAPI_DAILY_L, headers={"User-Agent": UA, "Accept": "application/json"}, timeout=60.0)
    r.raise_for_status()
    data = r.json()
    rows: list[dict] = []
    for item in data:
        # 注意：官方 key「主旨 」後方有空白
        title = item.get("主旨 ") or item.get("主旨") or ""
        speak_date = roc_to_iso(str(item.get("發言日期") or ""))
        event_date = roc_to_iso(str(item.get("事實發生日") or ""))
        row = make_row(
            symbol=str(item.get("公司代號") or ""),
            company_name=str(item.get("公司名稱") or ""),
            speak_date=speak_date or "",
            speak_time=str(item.get("發言時間") or ""),
            title=title,
            content=str(item.get("說明") or ""),
            clause=str(item.get("符合條款") or ""),
            event_date=event_date,
            source="openapi_t187ap04_L",
            raw=item,
        )
        if row:
            rows.append(row)
    print(f"[mops] openapi daily rows={len(rows)}", file=sys.stderr)
    return rows


def fetch_company_mopsov(
    client: httpx.Client,
    symbol: str,
    year: int | None = None,
    is_new: bool = False,
) -> list[dict]:
    """公司重大訊息列表（主旨；無全文說明）。"""
    roc_y = (year - 1911) if year else (date.today().year - 1911)
    payload = {
        "encodeURIComponent": "1",
        "step": "1",
        "firstin": "1",
        "off": "1",
        "TYPEK": "sii",
        "co_id": symbol,
        "year": "" if is_new else str(roc_y),
        "month": "",
        "isnew": "true" if is_new else "false",
        "keyword4": "",
        "code1": "",
        "TYPEK2": "",
        "checkbtn": "",
        "queryName": "co_id",
        "inpuType": "co_id",
    }
    headers = {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://mopsov.twse.com.tw/mops/web/t05st01",
        "Accept": "text/html,application/xhtml+xml",
    }
    r = client.post(MOPSOV_AJAX, data=payload, headers=headers, timeout=45.0, follow_redirects=True)
    r.raise_for_status()
    if "FOR SECURITY REASONS" in r.text or "無法呈現" in r.text:
        raise RuntimeError(f"mopsov blocked for {symbol}")

    soup = BeautifulSoup(r.text, "html.parser")
    rows: list[dict] = []
    for table in soup.find_all("table"):
        trs = table.find_all("tr")
        if len(trs) < 2:
            continue
        header = [c.get_text(" ", strip=True) for c in trs[0].find_all(["td", "th"])]
        if not any("主旨" in h for h in header):
            continue
        # expect: 公司代號 公司名稱 發言日期 發言時間 主旨
        for tr in trs[1:]:
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) < 5:
                continue
            speak_date = roc_to_iso(cells[2])
            row = make_row(
                symbol=cells[0] or symbol,
                company_name=cells[1],
                speak_date=speak_date or "",
                speak_time=cells[3],
                title=cells[4],
                content="",
                clause="",
                event_date=None,
                source="mopsov_t05st01",
                raw={"cells": cells},
            )
            if row:
                rows.append(row)
    print(f"[mops] company {symbol} rows={len(rows)}", file=sys.stderr)
    return rows


def dedupe(rows: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for r in rows:
        fp = r["fingerprint"]
        # 偏好有 content 的版本
        if fp not in seen or (len(r.get("content") or "") > len(seen[fp].get("content") or "")):
            seen[fp] = r
    return list(seen.values())


def load_existing_items() -> list[dict]:
    if not SNAPSHOT_PATH.exists():
        return []
    try:
        data = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        return list(data.get("items") or [])
    except Exception:
        return []


def write_snapshot(rows: list[dict], meta: dict, merge: bool = True) -> Path:
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    if merge:
        rows = dedupe(load_existing_items() + rows)
    payload = {
        "asOf": date.today().isoformat(),
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(rows),
        "meta": meta,
        "items": sorted(
            rows,
            key=lambda r: (r.get("speak_date") or "", r.get("speak_time") or ""),
            reverse=True,
        ),
    }
    SNAPSHOT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[mops] wrote {SNAPSHOT_PATH} count={len(rows)}", file=sys.stderr)
    return SNAPSHOT_PATH


def push_supabase(rows: list[dict]) -> int:
    load_env_file(REPO_ROOT / ".env.local")
    load_env_file(REPO_ROOT / ".env")
    url = (os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        raise RuntimeError("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY")

    endpoint = f"{url}/rest/v1/mops_announcements?on_conflict=fingerprint"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    # flatten for PostgREST (drop huge raw if needed)
    body = []
    for r in rows:
        body.append(
            {
                "symbol": r["symbol"],
                "company_name": r.get("company_name"),
                "speak_date": r["speak_date"],
                "speak_time": r.get("speak_time"),
                "title": r["title"],
                "content": r.get("content") or None,
                "clause": r.get("clause") or None,
                "event_date": r.get("event_date"),
                "market": r.get("market") or "tw",
                "source": r["source"],
                "fingerprint": r["fingerprint"],
                "raw": r.get("raw") or {},
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    total = 0
    batch = 100
    with httpx.Client(timeout=60.0) as client:
        for i in range(0, len(body), batch):
            chunk = body[i : i + batch]
            resp = client.post(endpoint, headers=headers, json=chunk)
            if resp.status_code >= 400:
                raise RuntimeError(f"upsert failed HTTP {resp.status_code}: {resp.text[:500]}")
            total += len(chunk)
            print(f"[mops] upserted {total}/{len(body)}", file=sys.stderr)

        # etl_logs
        log_endpoint = f"{url}/rest/v1/etl_logs"
        client.post(
            log_endpoint,
            headers={**headers, "Prefer": "return=minimal"},
            json={
                "job_name": "mops_announcements",
                "status": "success",
                "source": "MOPS/TWSE",
                "records_count": total,
                "message": f"upserted {total} announcements",
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "meta": {"table": "mops_announcements"},
            },
        )
    return total


def main() -> int:
    ap = argparse.ArgumentParser(description="MOPS 重大訊息 ETL")
    ap.add_argument("--mode", choices=["daily", "company", "core"], default="daily")
    ap.add_argument("--symbol", help="company mode 代號")
    ap.add_argument("--year", type=int, help="西元年，預設今年")
    ap.add_argument("--push", action="store_true", help="寫入 Supabase")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--delay", type=float, default=0.8, help="公司爬取間隔秒數")
    args = ap.parse_args()

    rows: list[dict] = []
    meta: dict = {"mode": args.mode}

    with httpx.Client() as client:
        if args.mode == "daily":
            rows = fetch_daily_openapi(client)
        elif args.mode == "company":
            if not args.symbol:
                print("[mops] ERROR: --symbol required", file=sys.stderr)
                return 2
            rows = fetch_company_mopsov(client, args.symbol, year=args.year)
            meta["symbol"] = args.symbol
        elif args.mode == "core":
            # 日更 + 核心 20 檔年度列表
            rows.extend(fetch_daily_openapi(client))
            for sym in CORE_SYMBOLS:
                try:
                    rows.extend(fetch_company_mopsov(client, sym, year=args.year))
                except Exception as e:
                    print(f"[mops] warn {sym}: {e}", file=sys.stderr)
                time.sleep(args.delay)
            meta["symbols"] = CORE_SYMBOLS

    rows = dedupe(rows)
    meta["count"] = len(rows)

    if args.dry_run:
        sample = [r for r in rows if r["symbol"] in ("2330", "2317", "2454")][:3]
        if not sample:
            sample = rows[:3]
        print(json.dumps({"count": len(rows), "sample": sample}, ensure_ascii=False, indent=2))
        print("[mops] dry-run OK", file=sys.stderr)
        return 0

    write_snapshot(rows, meta)

    if args.push:
        try:
            n = push_supabase(rows)
            print(f"[mops] SUCCESS push {n} rows", file=sys.stderr)
        except Exception as e:
            print(f"[mops] ERROR push: {e}", file=sys.stderr)
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
