#!/usr/bin/env python3
"""Generate the hosting redirect file from the canonical redirect map.

The production host for digitallyshifted.com is LiteSpeed (Apache-compatible
.htaccess, see docs/SITE-AUDIT.md), so the emitted file is an .htaccess using
a small, regular mod_rewrite subset:

  - RewriteEngine / RewriteCond / RewriteRule with flags R=301, G, L, QSA, NC
  - RewriteCond variables: HTTPS, HTTP_HOST, QUERY_STRING, REQUEST_FILENAME
  - ErrorDocument 404, Options -Indexes

docs/migration/tools/test_redirects.py executes exactly this subset against a
built output directory, so the generated file is tested, not just the map.

Usage:
  python3 docs/migration/tools/generate_redirects.py --out /path/to/.htaccess \
      [--base-path /website-relaunch]

Reads (repo-relative):
  docs/migration/redirect-map.json
  docs/migration/media-manifest.json
  legacy-static/assets/media/

The output is deterministic: no timestamps, no environment details.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parents[3]

SECTION_EXPLICIT = "1:1 and merged page redirects (exact)"
SECTION_FEEDS = "Feeds (RSS/comment) — intentionally removed"
SECTION_WP_SYSTEM = "WordPress system endpoints — intentionally removed"
SECTION_UPLOADS = "Migrated upload files (from media-manifest.json)"
SECTION_STRUCTURAL = "Structural pattern redirects"
SECTION_QUERIES = "WordPress query-string URLs"


def esc_literal(path: str) -> str:
    """Escape a literal URL path for use inside a regex."""
    return re.escape(path.strip("/"))


def exact_pattern(old: str) -> str:
    """Pattern matching an old page path with optional trailing slash.

    WordPress page URLs end with a slash; requests without the slash must
    redirect too. Non-directory endpoints (.php files) match exactly.
    """
    if old.endswith("/"):
        return f"^{esc_literal(old)}/?$"
    return f"^{esc_literal(old)}$"


def rule(pattern: str, target: str, flags: str, comment: str | None = None) -> str:
    lines = []
    if comment:
        lines.append(f"# {comment}")
    lines.append(f"RewriteRule {pattern} {target} {flags}")
    return "\n".join(lines)


def guarded(text: list[str], pattern: str, target: str, flags: str,
            comment: str | None = None) -> str:
    """A pattern rule that never wins over a real file or directory."""
    lines = []
    if comment:
        lines.append(f"# {comment}")
    lines.append("RewriteCond %{REQUEST_FILENAME} !-f")
    lines.append("RewriteCond %{REQUEST_FILENAME} !-d")
    lines.append(f"RewriteRule {pattern} {target} {flags}")
    return "\n".join(lines)


def section(title: str) -> str:
    bar = "#" * 74
    return f"\n{bar}\n# {title}\n{bar}\n"


def load_media_rules(media_manifest: Path, media_dir: Path, output_dir: Path,
                     old_prefix: str, target_dir: str) -> list[tuple[str, str, str]]:
    """Return (old_path, new_path, old_url) for uploads that ship in the output.

    old_prefix keeps its leading slash ("/wp-content/uploads/"). The old path
    comes from the manifest src, which can be a size variant (-scaled.jpg,
    -2048x2048.jpg); the migrated file name comes from base with the
    documented conversion rule. A file only gets a 301 when it exists in the
    deploy output: scripts/build-site.sh prunes media that no deploy page
    references (DIG-90), and those old URLs fall to the uploads 410 instead.
    """
    entries = json.loads(media_manifest.read_text(encoding="utf-8"))
    host_prefix = f"https://digitallyshifted.com{old_prefix}"
    rules: list[tuple[str, str, str]] = []
    problems: list[str] = []
    for entry in entries:
        base = entry["base"]
        old_url = entry["src"]
        if not old_url.startswith(host_prefix):
            problems.append(f"unexpected media src outside {old_prefix}: {old_url}")
            continue
        candidates = [base, Path(base).stem + ".webp"]
        new_name = next((c for c in candidates if (media_dir / c).is_file()), None)
        if new_name is None:
            problems.append(f"no migrated file for {base} (tried {candidates})")
            continue
        if not (output_dir / new_name).is_file():
            continue  # pruned from the deploy output on purpose (DIG-90)
        old_path = urlparse(old_url).path
        new_path = target_dir + new_name
        rules.append((old_path, new_path, old_url))
    if problems:
        raise SystemExit("media derivation failed:\n  " + "\n  ".join(problems))
    rules.sort(key=lambda r: r[0])
    return rules


def validate_map(map_data: dict) -> None:
    seen: dict[str, str] = {}
    for row in map_data.get("redirects", []):
        if row["old"] in seen:
            raise SystemExit(f"duplicate redirect source: {row['old']}")
        seen[row["old"]] = "redirect"
    for row in map_data.get("system410", []):
        if row["path"] in seen:
            raise SystemExit(f"duplicate 410 source: {row['path']}")
        seen[row["path"]] = "410"
    for row in map_data.get("sameUrl", []):
        if row["path"] in seen:
            raise SystemExit(f"same-URL path also has a rule: {row['path']}")
        seen[row["path"]] = "same"
    for row in map_data.get("patterns", []):
        if "regex" in row:
            re.compile(row["regex"])
    for row in map_data.get("queries", []):
        re.compile(row["regex"])


def generate(map_data: dict, media_rules: list[tuple[str, str, str]],
             base_path: str) -> str:
    out: list[str] = []
    domain = map_data["domain"]
    apex = f"https://{domain}"

    out.append(f"""\
# Generated by docs/migration/tools/generate_redirects.py — do not edit.
# Source of truth: docs/migration/redirect-map.json (DIG-89).
# Regenerate: python3 docs/migration/tools/generate_redirects.py --out <path>
# Platform: LiteSpeed (Apache-compatible .htaccess). Host: dshost.co.za.
# Old site: WordPress at {apex}. Canonical origin: {apex}.""")
    if base_path:
        out.append(f"# Base path: {base_path} (prefix hosting; host canonicalization disabled).")

    out.append("\n# Keep directory listings off.")
    out.append("Options -Indexes")

    error_doc = f"{base_path}/404.html" if base_path else "/404.html"
    out.append("\n# Keep real 404 statuses with the site's 404 page.")
    out.append(f"ErrorDocument 404 {error_doc}")

    out.append(section("Rewrite engine"))
    out.append("<IfModule mod_rewrite.c>")
    out.append("RewriteEngine On")

    if not base_path:
        out.append("")
        out.append("# Canonical origin: force HTTPS on the apex domain.")
        out.append("# The old host behaved this way (docs/audit-evidence/final-checks.json).")
        out.append("RewriteCond %{HTTPS} !=on [OR]")
        out.append(f"RewriteCond %{{HTTP_HOST}} ^www\\.{re.escape(domain)}$ [NC]")
        out.append(f"RewriteRule ^ {apex}%{{REQUEST_URI}} [R=301,L,QSA]")

    # --- explicit page redirects -----------------------------------------
    out.append(section(SECTION_EXPLICIT))
    for row in map_data["redirects"]:
        out.append(rule(exact_pattern(row["old"]), row["new"], "[R=301,L,QSA]",
                        f"{row['old']} -> {row['new']} [{row['kind']}]"))

    # --- feeds ------------------------------------------------------------
    out.append(section(SECTION_FEEDS))
    for pat, note in [
        ("^feed/?$", "site feed"),
        ("^comments/feed/?$", "comment feed"),
        ("^.+/feed/?$", "per-post comment feeds"),
    ]:
        out.append(guarded([], pat, "-", "[G,L]", note))

    # --- WordPress system endpoints ---------------------------------------
    out.append(section(SECTION_WP_SYSTEM))
    for row in map_data["system410"]:
        out.append(rule(exact_pattern(row["path"]), "-", "[G,L]",
                        f"{row['path']} — {row['note'].split(';')[0]}"))
    catchall = next(p for p in map_data["patterns"] if p["id"] == "wp-system-catchall")
    out.append(guarded([], catchall["regex"], "-", "[G,L]",
                       "Catch-all for other WordPress system paths."))

    # --- author archives ---------------------------------------------------
    out.append(section("Author archives — intentionally removed"))
    out.append(guarded([], "^author/.+", "-", "[G,L]",
                       "Author archives are WordPress plumbing."))

    # --- uploads ------------------------------------------------------------
    out.append(section(SECTION_UPLOADS))
    for old_path, new_path, old_url in media_rules:
        out.append(rule(f"^{esc_literal(old_path)}$", new_path, "[R=301,L,QSA]",
                        f"{old_url}"))
    uploads_fb = next(p for p in map_data["patterns"] if p["id"] == "uploads-fallback")
    out.append(guarded([], uploads_fb["regex"], "-", "[G,L]",
                       "Upload files outside the migrated set are gone."))

    # --- structural patterns -------------------------------------------------
    out.append(section(SECTION_STRUCTURAL))
    cat = next(p for p in map_data["patterns"] if p["id"] == "category-catchall")
    out.append(guarded([], cat["regex"], cat["target"], "[R=301,L,QSA]",
                       "Unknown category slugs go to the blog hub, never into a 404."))
    tag = next(p for p in map_data["patterns"] if p["id"] == "tag-catchall")
    out.append(guarded([], tag["regex"], tag["target"], "[R=301,L,QSA]",
                       "Tag archives (~90 URLs linked from old posts) go to the blog hub."))
    # Date archives are exact paths: the year/month directories exist in the
    # build only as parents of migrated posts, so these rules run unguarded.
    out.append(rule("^\\d{4}/?$", "-", "[G,L]", "Date archive: /YYYY/"))
    out.append(rule("^\\d{4}/\\d{2}/?$", "-", "[G,L]", "Date archive: /YYYY/MM/"))
    date_fb = next(p for p in map_data["patterns"] if p["id"] == "date-permalink-fallback")
    out.append(guarded([], date_fb["regex"], "-", "[G,L]",
                       "Unknown date-permalink post URLs. Guards keep the served "
                       "pillar guide (same URL) safe."))
    page_rule = next(p for p in map_data["patterns"] if p["id"] == "pagination")
    out.append(guarded([], page_rule["regex"], "-", "[G,L]",
                       "Archive pagination never existed on the old blog."))

    # --- query strings ---------------------------------------------------------
    out.append(section(SECTION_QUERIES))
    for row in map_data["queries"]:
        out.append(f"# {row['regex']} — {row['note']}")
        out.append(f"RewriteCond %{{QUERY_STRING}} {row['regex']}")
        out.append(f"RewriteRule ^$ {row['target']} [R=301,L]")

    out.append("\n</IfModule>")
    out.append("")
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--map", default=str(REPO / "docs/migration/redirect-map.json"))
    parser.add_argument("--media-manifest",
                        default=str(REPO / "docs/migration/media-manifest.json"))
    parser.add_argument("--media-dir",
                        default=str(REPO / "legacy-static/assets/media"),
                        help="migrated media library used to derive file names")
    parser.add_argument("--media-output-dir", default=None,
                        help="media directory of the deploy output; a 301 is "
                             "emitted only for files present here (default: "
                             "same as --media-dir)")
    parser.add_argument("--base-path", default="",
                        help="URL prefix when the site is hosted under a sub-path "
                             "(staging: /website-relaunch). Empty for a root deploy.")
    parser.add_argument("--out", required=True, help="Output .htaccess path")
    args = parser.parse_args()

    map_path = Path(args.map)
    map_data = json.loads(map_path.read_text(encoding="utf-8"))
    validate_map(map_data)

    media = map_data["media"]
    output_dir = (Path(args.media_output_dir) if args.media_output_dir
                  else Path(args.media_dir))
    media_rules = load_media_rules(Path(args.media_manifest), Path(args.media_dir),
                                   output_dir, media["oldPrefix"],
                                   media["targetDir"])
    expected = media.get("count")
    if expected is not None and len(media_rules) > expected:
        raise SystemExit(f"media rule count {len(media_rules)} exceeds manifest size {expected}")

    base_path = args.base_path.rstrip("/")
    text = generate(map_data, media_rules, base_path)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")

    redirects = len(map_data["redirects"])
    gone = len(map_data["system410"])
    print(f"wrote {out_path}")
    print(f"  explicit 301 page rules: {redirects}")
    print(f"  migrated media rules:    {len(media_rules)}")
    print(f"  explicit 410 endpoints:  {gone}")
    print(f"  base path:               {base_path or '(root deploy)'}")
    print(f"  host canonicalization:   {'off (prefix hosting)' if base_path else 'on'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
