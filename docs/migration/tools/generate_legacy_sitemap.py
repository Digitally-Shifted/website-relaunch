#!/usr/bin/env python3
"""Append the legacy pages that serve as-is to the built XML sitemap.

The Astro sitemap (@astrojs/sitemap) covers only Astro routes. The migrated
legacy pages under legacy-static/ serve at their exact old URLs (the
redirect map's "sameUrl" entries) but never appear in the built sitemap, so
search engines miss them (DIG-106 SEO package, DIG-118).

This step runs inside scripts/build-site.sh after `astro build` and inserts
one <url> entry per sameUrl page that is not already in the sitemap:

  - The lastmod date lives in the redirect map ("lastmod", YYYY-MM-DD) and
    records the page's real last-modified date. Update it whenever a legacy
    page's content changes (publish or refresh); the build fails when it is
    missing, so a refreshed page cannot ship a stale sitemap date.
  - Paths that already appear in the sitemap (Astro-served routes such as
    / and /blog/) are skipped, so the step never duplicates an entry and
    needs no lastmod for them. When a legacy page is later ported to an
    Astro route, the Astro sitemap takes the URL back automatically.
  - A sameUrl path that also appears as a 301 redirect or a system 410 is a
    map contradiction and fails the build: no sitemap URL may be a 301 or
    410.
  - Every emitted URL must resolve to a page in the build output, so the
    sitemap never lists a 404.

Usage:
  python3 docs/migration/tools/generate_legacy_sitemap.py \
      --out-dir <build-output-dir> [--base-path /website-relaunch] \
      [--map docs/migration/redirect-map.json]

Reads:
  docs/migration/redirect-map.json
  <out-dir>/sitemap-*.xml (written by @astrojs/sitemap)

The output is deterministic: no timestamps, no environment details.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape

REPO = Path(__file__).resolve().parents[3]

URL_BLOCK = re.compile(r"<url>[\s\S]*?</url>")
LOC = re.compile(r"<loc>([\s\S]*?)</loc>")


def fail(message: str) -> None:
    print(f"CHECK FAILED: {message}", file=sys.stderr)
    sys.exit(1)


def page_path(raw: str) -> str:
    """Normalise a map path to a directory-style page path (/dir/)."""
    trimmed = raw.strip().strip("/")
    if not trimmed:
        return "/"
    return f"/{trimmed}/"


def loc_of_block(block: str) -> str:
    match = LOC.search(block)
    return match.group(1).strip() if match else ""


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Append redirect-map sameUrl pages to the built sitemap.",
    )
    parser.add_argument("--map", default=str(REPO / "docs/migration/redirect-map.json"))
    parser.add_argument(
        "--base-path", default="",
        help="Public base path the build ran under (empty for production)",
    )
    parser.add_argument(
        "--out-dir", required=True,
        help="Build output directory that contains sitemap-*.xml",
    )
    args = parser.parse_args()

    base = args.base_path.strip().strip("/")
    base = f"/{base}" if base else ""
    out_dir = Path(args.out_dir)
    sitemap_paths = sorted(
        p for p in out_dir.glob("sitemap-*.xml") if p.name != "sitemap-index.xml"
    )
    if not sitemap_paths:
        fail(f"no sitemap-*.xml found in {out_dir}; run after 'astro build'")

    # Read the Astro urlsets and the serving origin they encode.
    urlsets: list[tuple[Path, str, str, list[str]]] = []
    existing_locs: set[str] = set()
    origin = ""
    for sitemap_path in sitemap_paths:
        text = sitemap_path.read_text(encoding="utf-8")
        match = re.search(r"^([\s\S]*?<urlset[^>]*>)([\s\S]*?)(</urlset>)\s*$", text)
        if not match:
            fail(f"{sitemap_path.name} is not a sitemap urlset")
        blocks = URL_BLOCK.findall(match.group(2))
        for block in blocks:
            loc = loc_of_block(block)
            if not loc:
                fail(f"{sitemap_path.name} has a <url> without a <loc>")
            existing_locs.add(loc)
            parsed = urlparse(loc)
            if parsed.scheme and parsed.netloc:
                origin = f"{parsed.scheme}://{parsed.netloc}"
        urlsets.append((sitemap_path, match.group(1), match.group(3), blocks))
    if not origin:
        fail("the sitemap carries no absolute URLs; cannot derive the serving origin")

    # The home URL must already be listed: it proves --base-path matches the
    # prefix Astro actually baked into the sitemap locs.
    if f"{origin}{base}/" not in existing_locs:
        fail(
            f"home URL {origin}{base}/ is not in the sitemap; --base-path does not "
            "match the build (Astro emitted a different prefix)"
        )

    map_data = json.loads(Path(args.map).read_text(encoding="utf-8"))
    canonical_origin = str(map_data.get("canonicalOrigin", "")).rstrip("/")
    if canonical_origin and canonical_origin != origin:
        fail(
            f"sitemap origin {origin} does not match the map canonicalOrigin "
            f"{canonical_origin}"
        )
    redirect_paths = {page_path(e["old"]) for e in map_data.get("redirects", [])}
    gone_paths = {page_path(e["path"]) for e in map_data.get("system410", [])}

    # Validate every sameUrl entry and collect the ones to append.
    added: list[tuple[str, str]] = []
    for entry in map_data.get("sameUrl", []):
        raw = str(entry.get("path", "")).strip()
        if not raw:
            fail("sameUrl entry without a path in the map")
        path = page_path(raw)
        loc = f"{origin}{base}{path}"
        if loc in existing_locs:
            # An Astro route serves this URL; the Astro sitemap already lists it.
            continue
        if path in redirect_paths:
            fail(
                f"{path} is both a sameUrl page and a 301 redirect in the map; "
                "remove the redirect row before publishing the page"
            )
        if path in gone_paths:
            fail(f"{path} is both a sameUrl page and a system 410 in the map")
        lastmod = str(entry.get("lastmod", "")).strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", lastmod):
            fail(
                f"sameUrl entry {path} has no lastmod (YYYY-MM-DD) in the map; set "
                "it to the page's real last-modified date whenever its content "
                "changes"
            )
        page_file = out_dir / path.lstrip("/") / "index.html"
        if not page_file.is_file():
            fail(
                f"{path} is not in the build output (missing {page_file}); the "
                "sitemap must not list a 404"
            )
        added.append((loc, lastmod))

    # Merge into each urlset, keeping it sorted by loc like the Astro output.
    for sitemap_path, head, tail, blocks in urlsets:
        by_loc = {loc_of_block(block): block for block in blocks}
        for loc, lastmod in added:
            by_loc[loc] = (
                f"<url><loc>{escape(loc)}</loc>"
                f"<lastmod>{escape(lastmod)}</lastmod></url>"
            )
        merged = "".join(by_loc[loc] for loc in sorted(by_loc))
        sitemap_path.write_text(f"{head}{merged}{tail}\n", encoding="utf-8")

    for loc, lastmod in added:
        print(f"sitemap: + {loc} (lastmod {lastmod})")
    print(
        f"legacy sitemap entries: {len(added)} added, "
        f"{len(existing_locs)} Astro route(s) already listed"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
