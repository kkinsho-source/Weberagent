#!/usr/bin/env python3
"""Generate supabase/expand_tier0_s4.sql from mock.ts + core_universe.json"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[2] if Path(__file__).name == "gen_expand_tier0_s4.py" else Path(
    r"D:/weberanent/aistockmap-project"
)
# allow running as one-off from anywhere
if not (REPO / "lib/data/core_universe.json").exists():
    REPO = Path(r"D:/weberanent/aistockmap-project")


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def parse_themes(mock: str) -> list[dict]:
    themes: list[dict] = []
    parts = re.split(r"\n  \{\n    slug: '", mock)
    for p in parts[1:]:
        if "export const stocks" in p:
            p = p.split("export const stocks")[0]
        slug = p.split("'", 1)[0]
        title_m = re.search(r"title:\s*'([^']*)'", p)
        desc_m = re.search(
            r"description:\s*\n?\s*((?:'[^']*'\s*\n?\s*\+\s*\n?\s*)*'[^']*')",
            p,
        )
        if desc_m:
            desc = "".join(re.findall(r"'([^']*)'", desc_m.group(1)))
        else:
            dm = re.search(r"description:\s*'([^']*)'", p)
            desc = dm.group(1) if dm else ""
        market = re.search(r"market:\s*'([^']+)'", p).group(1)
        cc = int(re.search(r"companyCount:\s*(\d+)", p).group(1))
        va = re.search(r"verifiedAt:\s*'([^']+)'", p).group(1)
        tier = int(re.search(r"tier:\s*(\d+)", p).group(1))
        family = re.search(r"family:\s*'([^']+)'", p).group(1)
        radar = re.search(r"radarDefault:\s*(true|false)", p).group(1) == "true"
        themes.append(
            {
                "slug": slug,
                "title": title_m.group(1) if title_m else slug,
                "description": desc,
                "market": market,
                "company_count": cc,
                "verified_at": va,
                "tier": tier,
                "family": family,
                "radar_default": radar,
            }
        )
    return themes


def main() -> None:
    univ = json.loads((REPO / "lib/data/core_universe.json").read_text(encoding="utf-8"))
    mock = (REPO / "lib/data/mock.ts").read_text(encoding="utf-8")
    themes = parse_themes(mock)
    assert len(themes) == 23, f"expected 23 themes, got {len(themes)}"
    assert len(univ["stocks"]) == 106, f"expected 106 stocks, got {len(univ['stocks'])}"

    lines: list[str] = []
    lines += [
        "-- S4：themes 分層欄位 + 全 23 題材 upsert + core 106 檔 stocks（可重跑）",
        "-- 前提：已有 public.themes / public.stocks（core_tables + themes_and_edges）",
        "-- 請在 Supabase → SQL Editor 整段執行（service_role 無法任意 DDL）",
        "",
        "-- ========== A. DDL ==========",
        "alter table public.themes add column if not exists tier smallint not null default 1;",
        "alter table public.themes add column if not exists family text not null default 'ai_chain';",
        "alter table public.themes add column if not exists radar_default boolean not null default true;",
        "comment on column public.themes.tier is '0=全市場粗網 1=AI細題 2=預留細拆';",
        "comment on column public.themes.family is 'ai_chain|defensive|cyclical|electronics_ex_ai|other|benchmark';",
        "",
        "-- ========== B. Upsert 23 themes ==========",
        "insert into public.themes (market, slug, title, description, verified_at, company_count, tier, family, radar_default) values",
    ]
    vals = []
    for t in themes:
        vals.append(
            "  ({m},{slug},{title},{desc},{va},{cc},{tier},{fam},{rd})".format(
                m=sql_str(t["market"]),
                slug=sql_str(t["slug"]),
                title=sql_str(t["title"]),
                desc=sql_str(t["description"]),
                va=sql_str(t["verified_at"]),
                cc=t["company_count"],
                tier=t["tier"],
                fam=sql_str(t["family"]),
                rd="true" if t["radar_default"] else "false",
            )
        )
    lines.append(",\n".join(vals))
    lines += [
        "on conflict (slug) do update set",
        "  title = excluded.title,",
        "  description = excluded.description,",
        "  verified_at = excluded.verified_at,",
        "  company_count = excluded.company_count,",
        "  tier = excluded.tier,",
        "  family = excluded.family,",
        "  radar_default = excluded.radar_default,",
        "  market = excluded.market;",
        "",
        "-- ========== C. Upsert 106 stocks（theme_slug 對齊；不覆蓋已有非零價）==========",
        "insert into public.stocks (symbol, market, name, industry, theme_slug, price, change_pct, market_cap)",
        "values",
    ]
    svals = []
    for s in univ["stocks"]:
        svals.append(
            "  ({sym},'tw',{name},{ind},{theme},0,0,{mc})".format(
                sym=sql_str(s["symbol"]),
                name=sql_str(s["name"]),
                ind=sql_str(s["industry"]),
                theme=sql_str(s["themeSlug"]),
                mc=s["marketCap"],
            )
        )
    lines.append(",\n".join(svals))
    lines += [
        "on conflict (symbol, market) do update set",
        "  name = excluded.name,",
        "  industry = excluded.industry,",
        "  theme_slug = excluded.theme_slug,",
        "  market_cap = coalesce(nullif(public.stocks.market_cap, 0), excluded.market_cap);",
        "",
        "-- ========== D. 抽查 ==========",
        "select tier, family, count(*) as n from public.themes group by 1, 2 order by 1, 2;",
        "select count(*) as stock_count from public.stocks;",
        "select count(*) filter (where tier = 0) as tier0_themes from public.themes;",
        "select theme_slug, count(*) as n from public.stocks group by 1 order by 1;",
    ]

    out = REPO / "supabase" / "expand_tier0_s4.sql"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes)")
    print(f"themes={len(themes)} stocks={len(univ['stocks'])} tier0={sum(1 for t in themes if t['tier']==0)}")


if __name__ == "__main__":
    main()
