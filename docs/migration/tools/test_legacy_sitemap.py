#!/usr/bin/env python3
"""Tests for docs/migration/tools/generate_legacy_sitemap.py (DIG-118).

Runs the generator against small fixture build outputs and asserts the
sitemap contract:

  1. SameUrl pages are appended with their map lastmod, sorted by loc, and
     a second run is idempotent (no duplicates).
  2. Staging builds list the pages under the base path prefix.
  3. A sameUrl entry without lastmod fails the build.
  4. A sameUrl path that is also a 301 redirect or a system 410 fails.
  5. A sameUrl page missing from the build output fails.
  6. An Astro-served sameUrl path already in the sitemap is skipped.
  7. A base path that does not match the built sitemap fails.

Usage:
  python3 docs/migration/tools/test_legacy_sitemap.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SCRIPT = REPO / "docs/migration/tools/generate_legacy_sitemap.py"

URLSET_OPEN = (
    '<?xml version="1.0" encoding="UTF-8"?>'
    '<urlset xmlns="http://www.schemas.sitemaps.org/placeholder" '
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">'
)
URLSET_CLOSE = "</urlset>"
ORIGIN = "https://example.com"


def write_fixture(out_dir: Path, astro_locs: list[str], pages: list[str]) -> None:
    """Write a minimal built-output fixture: an Astro sitemap and pages."""
    out_dir.mkdir(parents=True, exist_ok=True)
    blocks = "".join(f"<url><loc>{loc}</loc></url>" for loc in astro_locs)
    (out_dir / "sitemap-0.xml").write_text(
        f"{URLSET_OPEN}{blocks}{URLSET_CLOSE}\n", encoding="utf-8"
    )
    for page in pages:
        page_dir = out_dir / page.strip("/")
        page_dir.mkdir(parents=True, exist_ok=True)
        (page_dir / "index.html").write_text("<html></html>", encoding="utf-8")


def write_map(path: Path, **overrides) -> None:
    map_data = {
        "canonicalOrigin": ORIGIN,
        "sameUrl": [
            {
                "path": "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
                "lastmod": "2026-10-18",
            },
            {
                "path": "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
                "lastmod": "2026-10-19",
            },
        ],
        "redirects": [],
        "system410": [],
    }
    map_data.update(overrides)
    path.write_text(json.dumps(map_data, indent=2), encoding="utf-8")


def run(out_dir: Path, map_path: Path, base_path: str = "") -> subprocess.CompletedProcess:
    return subprocess.run(
        [
            sys.executable, str(SCRIPT),
            "--map", str(map_path),
            "--out-dir", str(out_dir),
            "--base-path", base_path,
        ],
        capture_output=True, text=True,
    )


def locs(out_dir: Path) -> list[str]:
    text = (out_dir / "sitemap-0.xml").read_text(encoding="utf-8")
    return re.findall(r"<loc>([\s\S]*?)</loc>", text)


def expect_fail(result: subprocess.CompletedProcess, needle: str, label: str) -> None:
    assert result.returncode != 0, f"{label}: expected failure, got success"
    assert needle in result.stderr, f"{label}: expected '{needle}' in stderr, got: {result.stderr}"
    print(f"  PASS  {label}")


def main() -> int:
    print(f"Testing {SCRIPT.name}\n")
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)

        # 1. Happy path: appended, sorted, idempotent.
        out = root / "happy"
        astro = [f"{ORIGIN}/", f"{ORIGIN}/about/", f"{ORIGIN}/blog/"]
        write_fixture(out, astro, [
            "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
            "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
        ])
        map_path = root / "map.json"
        write_map(map_path)
        result = run(out, map_path)
        assert result.returncode == 0, f"happy path failed: {result.stderr}"
        guide = f"{ORIGIN}/2023/02/09/ultimate-digital-marketing-guide-for-businesses/"
        trends = f"{ORIGIN}/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/"
        text = (out / "sitemap-0.xml").read_text(encoding="utf-8")
        assert f"<loc>{guide}</loc><lastmod>2026-10-18</lastmod>" in text, "guide entry wrong"
        assert f"<loc>{trends}</loc><lastmod>2026-10-19</lastmod>" in text, "trends entry wrong"
        assert locs(out) == sorted(locs(out), key=str.lower), "urlset not sorted by loc"
        assert text.count(guide) == 1 and text.count(trends) == 1, "duplicate entries"
        before = text
        result = run(out, map_path)
        assert result.returncode == 0, f"rerun failed: {result.stderr}"
        assert (out / "sitemap-0.xml").read_text(encoding="utf-8") == before, "rerun not idempotent"
        print("  PASS  appends sameUrl pages with lastmod, sorted, idempotent")

        # 2. Staging base path prefix.
        out = root / "staged"
        write_fixture(out, [f"{ORIGIN}/website-relaunch/", f"{ORIGIN}/website-relaunch/about/"], [
            "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
            "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
        ])
        result = run(out, map_path, base_path="/website-relaunch")
        assert result.returncode == 0, f"staging run failed: {result.stderr}"
        text = (out / "sitemap-0.xml").read_text(encoding="utf-8")
        assert f"<loc>{ORIGIN}/website-relaunch/2023/02/01/" in text, "base path prefix missing"
        print("  PASS  lists legacy pages under the staging base path")

        # 3. Missing lastmod fails the build.
        out = root / "nolastmod"
        write_fixture(out, [f"{ORIGIN}/", f"{ORIGIN}/blog/"], [
            "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
            "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
        ])
        write_map(map_path, sameUrl=[
            {"path": "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/"},
            {"path": "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
             "lastmod": "2026-10-19"},
        ])
        expect_fail(run(out, map_path), "lastmod", "missing lastmod fails")

        # 4. sameUrl path that is also a 301 or 410 fails.
        out = root / "conflict"
        write_fixture(out, [f"{ORIGIN}/"], [
            "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
            "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
        ])
        write_map(map_path, redirects=[{
            "old": "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
            "new": "/blog/", "status": 301,
        }])
        expect_fail(run(out, map_path), "301 redirect", "sameUrl plus 301 fails")
        write_map(map_path, system410=[{
            "path": "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
        }])
        expect_fail(run(out, map_path), "system 410", "sameUrl plus 410 fails")

        # 5. Page missing from the output fails.
        out = root / "missing"
        write_fixture(out, [f"{ORIGIN}/"], [
            "/2023/02/09/ultimate-digital-marketing-guide-for-businesses/",
        ])
        write_map(map_path)
        expect_fail(run(out, map_path), "not in the build output", "missing page fails")

        # 6. Astro-served sameUrl path is skipped without lastmod.
        out = root / "astro"
        write_fixture(out, [f"{ORIGIN}/", f"{ORIGIN}/blog/"], [
            "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
        ])
        write_map(map_path, sameUrl=[
            {"path": "/blog/"},  # no lastmod: served by Astro, skipped
            {"path": "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/",
             "lastmod": "2026-10-19"},
        ])
        result = run(out, map_path)
        assert result.returncode == 0, f"astro-served skip failed: {result.stderr}"
        text = (out / "sitemap-0.xml").read_text(encoding="utf-8")
        assert text.count(f"{ORIGIN}/blog/") == 1, "blog duplicated"
        print("  PASS  skips Astro-served sameUrl paths without duplicating")

        # 7. Base path that does not match the build fails.
        out = root / "mismatch"
        write_fixture(out, [f"{ORIGIN}/", f"{ORIGIN}/about/"], [])
        write_map(map_path, sameUrl=[])
        expect_fail(run(out, map_path, base_path="/website-relaunch"),
                    "--base-path does not match", "base path mismatch fails")

    print("\nAll generate_legacy_sitemap tests pass.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
