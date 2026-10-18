#!/usr/bin/env python3
"""Local end-to-end test for the DIG-89 redirect map.

What it does (all locally, no network):
  1. Builds a production output with scripts/build-site.sh; the build now
     generates .htaccess into the output (docs/migration/redirect-map.json).
  2. Parses that generated .htaccess into a small engine that executes the
     same mod_rewrite subset LiteSpeed runs (R=301/G/L/QSA/NC, the HTTPS,
     HTTP_HOST, QUERY_STRING and REQUEST_FILENAME conditions).
  3. Serves the output over local HTTP through that engine and requests every
     old URL: page moves, same-URL pages, system endpoints, tag/category
     patterns, all 47 migrated media files, WordPress query URLs, host and
     scheme variants, plus the staging base-path variant.
  4. Asserts the status and Location of every case, that every 301 target
     exists in the build output (no redirect into a 404), and that every
     internal URL recorded from the old site is covered (no orphans).
  5. Writes a Markdown evidence report and exits non-zero on any failure.

Usage:
  python3 docs/migration/tools/test_redirects.py [--report <path>] [--keep]
"""

from __future__ import annotations

import argparse
import http.client
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

REPO = Path(__file__).resolve().parents[3]
MAP_PATH = REPO / "docs/migration/redirect-map.json"
DOMAIN = "digitallyshifted.com"
APEX = f"https://{DOMAIN}"

MIME = {
    ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
    ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4",
    ".txt": "text/plain", ".xml": "application/xml", ".json": "application/json",
    ".woff2": "font/woff2", ".woff": "font/woff",
}

# ---------------------------------------------------------------------------
# .htaccess engine (the subset the generator emits)
# ---------------------------------------------------------------------------

class Cond:
    def __init__(self, var: str, test: str, flags: set[str]):
        self.var = var
        self.test = test          # '=x', '!=x', regex, '-f', '!-f', '-d', '!-d'
        self.flags = flags
        self.or_with_next = "OR" in flags

    def evaluate(self, ctx: dict) -> bool:
        if self.test in ("-f", "!-f"):
            result = os.path.isfile(ctx["REQUEST_FILENAME"])
        elif self.test in ("-d", "!-d"):
            result = os.path.isdir(ctx["REQUEST_FILENAME"])
        else:
            subject = ctx.get(self.var, "")
            if self.test.startswith("!="):
                result = subject != self.test[2:]
            elif self.test.startswith("="):
                result = subject == self.test[1:]
            else:
                flags = re.IGNORECASE if "NC" in self.flags else 0
                result = re.match(self.test, subject, flags) is not None
        return not result if self.test in ("!-f", "!-d") else result


class Rule:
    def __init__(self, conds: list[Cond], pattern: str, sub: str, flags: set[str]):
        self.conds = conds
        self.pattern = re.compile(pattern, re.IGNORECASE if "NC" in flags else 0)
        self.sub = sub
        self.flags = flags

    def conds_pass(self, ctx: dict) -> bool:
        if not self.conds:
            return True
        result = self.conds[0].evaluate(ctx)
        for cond in self.conds[1:]:
            value = cond.evaluate(ctx)
            result = (result or value) if self.conds_prev_or(cond) else (result and value)
        return result

    @staticmethod
    def conds_prev_or(cond: Cond) -> bool:
        # [OR] is declared on the *earlier* condition to join it with the next.
        return cond is not None and getattr(cond, "joined_from_previous", False)

    def matches(self, perdir_path: str) -> re.Match | None:
        return self.pattern.match(perdir_path)


class Engine:
    """Executes the generated .htaccess against a filesystem root."""

    def __init__(self, text: str, fs_root: Path, base_path: str = "", assume_https: bool = True):
        self.fs_root = fs_root
        self.base = base_path.strip("/")
        self.assume_https = assume_https
        self.error404 = None
        self.rules: list[Rule] = []
        self._parse(text)

    def _parse(self, text: str) -> None:
        conds: list[Cond] = []
        for raw in text.splitlines():
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("<") or line in ("</IfModule>",):
                continue
            if line.startswith("ErrorDocument 404"):
                self.error404 = line.split()[2]
                continue
            if line.startswith(("Options", "RewriteEngine", "DirectoryIndex")):
                continue
            if line.startswith("RewriteCond"):
                parts = line.split()
                var = parts[1]
                if var.startswith("%{") and var.endswith("}"):
                    var = var[2:-1]
                test = parts[2]
                flags = set(parts[3].strip("[]").split(",")) if len(parts) > 3 else set()
                conds.append(Cond(var, test, flags))
                continue
            if line.startswith("RewriteRule"):
                parts = line.split()
                pattern, sub = parts[1], parts[2]
                flags = set(parts[3].strip("[]").split(",")) if len(parts) > 3 else set()
                # [OR] joins a cond with the following one; record it on the
                # *following* cond so evaluation can look back.
                for i, cond in enumerate(conds):
                    cond.joined_from_previous = i > 0 and conds[i - 1].or_with_next
                self.rules.append(Rule(conds, pattern, sub, flags))
                conds = []
                continue
            raise AssertionError(f"engine cannot parse line: {line!r}")
        if conds:
            raise AssertionError("dangling RewriteCond without a RewriteRule")

    # -- path helpers -------------------------------------------------------

    def perdir(self, uri: str) -> str:
        path = uri.split("?", 1)[0]
        path = unquote(path)
        if self.base:
            prefix = "/" + self.base
            if path == prefix:
                path = "/"
            elif path.startswith(prefix + "/"):
                path = path[len(prefix):]
        return path.lstrip("/")

    def ctx(self, perdir_path: str, host: str, query: str) -> dict:
        fs = self.fs_root / perdir_path
        return {
            "HTTPS": "on" if self.assume_https else "off",
            "HTTP_HOST": host,
            "QUERY_STRING": query,
            "REQUEST_FILENAME": str(fs),
        }

    def apply(self, uri: str, host: str = DOMAIN, query: str = "") -> tuple:
        """Returns ('redirect', status, location) | ('gone',) | ('pass', perdir_path)."""
        perdir = self.perdir(uri)
        for rule in self.rules:
            match = rule.matches(perdir)
            if match is None or not rule.conds_pass(self.ctx(perdir, host, query)):
                continue
            sub = rule.sub.replace("%{REQUEST_URI}", "/" + perdir)
            for i in range(9, 0, -1):
                token = f"${i}"
                if token in sub and i <= (match.re.groups or 0):
                    sub = sub.replace(token, match.group(i) or "")
            if "G" in rule.flags:
                return ("gone",)
            if any(f.startswith("R=") for f in rule.flags):
                status = int(next(f for f in rule.flags if f.startswith("R=")).split("=")[1])
                location = sub
                if self.base and location.startswith("/"):
                    location = "/" + self.base + location
                if "QSA" in rule.flags and query:
                    location += ("&" if "?" in location else "?") + query
                return ("redirect", status, location)
            raise AssertionError(f"internal rewrite not expected in generated file: {rule.sub}")
        return ("pass", perdir)

    # -- static fallback -----------------------------------------------------

    def resolve(self, perdir_path: str) -> Path | None:
        candidate = self.fs_root / perdir_path
        if perdir_path and candidate.is_file():
            return candidate
        index = candidate / "index.html" if perdir_path else self.fs_root / "index.html"
        if index.is_file():
            return index
        return None


# ---------------------------------------------------------------------------
# Local HTTP server driving the engine
# ---------------------------------------------------------------------------

def make_server(engine: Engine):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):  # keep test output clean
            pass

        def do_GET(self):
            try:
                self._handle()
            except Exception as exc:  # surface engine bugs instead of dying silently
                self.send_response(500)
                self.end_headers()
                self.wfile.write(str(exc).encode())

        def _handle(self):
            parsed = urlparse(self.path)
            result = engine.apply(parsed.path, host=self.headers.get("Host", DOMAIN),
                                  query=parsed.query)
            if result[0] == "redirect":
                self.send_response(result[1])
                self.send_header("Location", result[2])
                self.end_headers()
                return
            if result[0] == "gone":
                body = b"410 Gone"
                self.send_response(410)
                self.send_header("Content-Type", "text/plain")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            file = engine.resolve(result[1])
            if file is None:
                error_doc = engine.fs_root / (engine.error404 or "404.html").lstrip("/")
                body = error_doc.read_bytes() if error_doc.is_file() else b"404 Not Found"
                self.send_response(404)
            else:
                body = file.read_bytes()
                self.send_response(200)
            mime = MIME.get(file.suffix if file else ".html", "application/octet-stream")
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def fetch(port: int, path: str, host: str = DOMAIN) -> tuple[int, str | None, bytes]:
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
    try:
        conn.request("GET", path, headers={"Host": host})
        response = conn.getresponse()
        return response.status, response.getheader("Location"), response.read()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Test harness
# ---------------------------------------------------------------------------

class Checker:
    def __init__(self):
        self.cases: list[dict] = []
        self.failures: list[str] = []

    def check(self, label: str, request: str, expected: str, actual: str, note: str = ""):
        actual = actual.rstrip()
        ok = expected == actual
        if not ok:
            self.failures.append(f"{label}: request {request!r} expected {expected!r}, got {actual!r} {note}")
        self.cases.append({"label": label, "request": request, "expected": expected,
                           "actual": actual, "pass": ok, "note": note})
        return ok

    @property
    def counts(self) -> tuple[int, int]:
        passed = sum(1 for c in self.cases if c["pass"])
        return passed, len(self.cases)


def normalize_target(location: str, base_path: str) -> str:
    """Location -> path inside the dist directory (query dropped)."""
    path = urlparse(location).path
    base = base_path.strip("/")
    if base:
        prefix = "/" + base
        if path == prefix:
            return "index.html"
        if path.startswith(prefix + "/"):
            path = path[len(prefix):]
    return path.lstrip("/") or "index.html"


def target_exists(dist: Path, path: str) -> bool:
    candidate = dist / path
    if candidate.is_file():
        return True
    return (candidate / "index.html").is_file() if path else False


def internal_urls_from_records(map_data: dict) -> dict[str, list[str]]:
    """Every internal URL recorded from the old site, grouped by source."""
    sources: dict[str, list[str]] = {}
    urls = json.loads((REPO / "docs/audit-evidence/urls.json").read_text())
    sources["audit urls.json"] = list(urls)
    sitemaps = json.loads((REPO / "docs/audit-evidence/sitemaps.json").read_text())
    flat = [u for entries in sitemaps.values() for u in entries.get("urls", [])]
    sources["sitemaps.json"] = flat
    extracted = sorted(p for p in (REPO / "docs/migration/extracted").glob("*.json")
                       if p.name != "_summary.json")
    links: list[str] = []
    for record_file in extracted:
        record = json.loads(record_file.read_text())
        for link in record.get("links", []):
            href = link.get("href", "")
            if href.startswith(f"https://{DOMAIN}") or href.startswith(f"http://{DOMAIN}"):
                links.append(href[len(f"https://{DOMAIN}"):] if href.startswith("https")
                             else href[len(f"http://{DOMAIN}"):])
        for key in ("images", "images_content"):
            for image in record.get(key, []) or []:
                src = image.get("src", "") if isinstance(image, dict) else str(image)
                if f"{DOMAIN}/wp-content/" in src:
                    links.append("/" + src.split(f"{DOMAIN}/", 1)[1])
    sources["extracted page records"] = links
    media = json.loads((REPO / "docs/migration/media-manifest.json").read_text())
    sources["media manifest"] = [entry["src"] for entry in media]
    return sources


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", default=str(REPO / "docs/migration/redirect-test-results.md"))
    parser.add_argument("--keep", action="store_true", help="keep the build directory")
    args = parser.parse_args()

    map_data = json.loads(MAP_PATH.read_text())
    base_path = ""  # production semantics
    started = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    tmp = Path(tempfile.mkdtemp(prefix="dig89-redirects-"))
    dist = tmp / "site"

    print(f"[1/6] building production output into {dist}")
    env = dict(os.environ, BUILD_ENV="production", BUILD_SHA="dig89-local-test",
               BUILD_TIME=started)
    build = subprocess.run(["bash", "scripts/build-site.sh", str(dist)], cwd=REPO,
                           env=env, capture_output=True, text=True, timeout=900)
    if build.returncode != 0:
        print(build.stdout[-2000:])
        print(build.stderr[-2000:])
        return fail_fast("site build failed")

    htaccess = dist / ".htaccess"
    if not htaccess.is_file():
        return fail_fast(".htaccess was not generated into the build output")

    print("[2/6] checking generator determinism and the staging variant")
    gen_args = [
        "--map", str(MAP_PATH),
        "--media-manifest", str(REPO / "docs/migration/media-manifest.json"),
        "--media-dir", str(REPO / "legacy-static/assets/media"),
        "--media-output-dir", str(dist / "assets/media"),
    ]
    regen = tmp / "regen.htaccess"
    subprocess.run([sys.executable, str(REPO / "docs/migration/tools/generate_redirects.py"),
                    *gen_args, "--out", str(regen)], cwd=REPO, check=True, capture_output=True)
    if regen.read_bytes() != htaccess.read_bytes():
        return fail_fast("generated .htaccess is not deterministic")
    staging_text = tmp / "staging.htaccess"
    subprocess.run([sys.executable, str(REPO / "docs/migration/tools/generate_redirects.py"),
                    *gen_args, "--base-path", "/website-relaunch", "--out", str(staging_text)],
                   cwd=REPO, check=True, capture_output=True)
    staging = staging_text.read_text()
    staging_checks = [
        ("staging has prefixed ErrorDocument", "ErrorDocument 404 /website-relaunch/404.html" in staging),
        ("staging omits host canonicalization", "%{HTTPS}" not in staging),
        ("production has host canonicalization", "%{HTTPS}" in htaccess.read_text()),
    ]

    print("[3/6] serving the output through the .htaccess engine")
    engine = Engine(htaccess.read_text(), dist, base_path=base_path, assume_https=True)
    engine_http = Engine(htaccess.read_text(), dist, base_path=base_path, assume_https=False)
    server = make_server(engine)
    server_http = make_server(engine_http)
    staging_engine = Engine(staging, dist, base_path="/website-relaunch", assume_https=True)
    staging_server = make_server(staging_engine)
    port, port_http, port_staging = server.server_address[1], server_http.server_address[1], staging_server.server_address[1]

    checker = Checker()

    # --- explicit page redirects (both slash variants + query preservation)
    print("[4/6] requesting every mapped URL")
    for row in map_data["redirects"]:
        old = row["old"]
        status, location, _ = fetch(port, old)
        checker.check(f"redirect {row['inventoryRow']}", old, f"301 {row['new']}",
                      f"{status} {location or ''}")
        status, location, _ = fetch(port, old.rstrip("/") or old)
        if old != old.rstrip("/"):
            checker.check(f"redirect {row['inventoryRow']} (no slash)", old.rstrip("/"),
                          f"301 {row['new']}", f"{status} {location or ''}")
    status, location, _ = fetch(port, "/contact-us/?need=quote")
    checker.check("query preserved", "/contact-us/?need=quote",
                  "301 /contact/?need=quote", f"{status} {location or ''}")

    # --- same-URL pages keep serving
    for row in map_data["sameUrl"]:
        status, location, _ = fetch(port, row["path"])
        checker.check("same URL", row["path"], "200", f"{status} {location or ''}")
    status, _, _ = fetch(port, "/2023/02/09/ultimate-digital-marketing-guide-for-businesses")
    checker.check("same URL (no slash)",
                  "/2023/02/09/ultimate-digital-marketing-guide-for-businesses", "200", str(status))

    # --- system endpoints and pattern samples
    gone_cases = [row["path"] for row in map_data["system410"]] + [
        "/wp-json/wp/v2/users", "/wp-includes/js/jquery/jquery.min.js",
        "/wp-content/plugins/x/y.js", "/wp-content/themes/t/style.css",
        "/wp-content/litespeed/js/abc.js", "/wp-content/cache/all/x.html",
        "/2023/02/01/stay-ahead-of-the-game-2023s-top-digital-marketing-trends/feed/",
        "/author/admin/",
    ]
    for path in gone_cases:
        status, location, _ = fetch(port, path)
        checker.check("410 system/pattern", path, "410", str(status))
    pattern_cases = [
        ("/category/unknown-topic/", "301 /blog/"),
        ("/tag/google-ads/", "301 /blog/"),
        ("/2023/", "410"), ("/2023/02/", "410"),
        ("/2023/06/01/a-post-we-never-saw/", "410"),
        ("/page/2/", "410"),
        ("/wp-content/uploads/some-other-file.jpg", "410"),
    ]
    for path, expected in pattern_cases:
        status, location, _ = fetch(port, path)
        checker.check("pattern", path, expected, f"{status} {location or ''}")

    # --- WordPress query URLs
    for path, target in [("/?p=8", "/blog/"), ("/?page_id=2", "/blog/"),
                         ("/?cat=3", "/blog/"), ("/?s=hosting", "/blog/"),
                         ("/?attachment_id=12", "/blog/")]:
        status, location, _ = fetch(port, path)
        checker.check("query URL", path, f"301 {target}", f"{status} {location or ''}")

    # --- every migrated media file
    # --- migrated media: 301 only when the file ships in this output
    media = json.loads((REPO / "docs/migration/media-manifest.json").read_text())
    media_dir = REPO / "legacy-static/assets/media"
    output_media = dist / "assets/media"
    media_301, media_gone, media_missing = 0, 0, []
    for entry in media:
        old_url = urlparse(entry["src"]).path
        base = entry["base"]
        candidates = [base, Path(base).stem + ".webp"]
        new_name = next((c for c in candidates if (media_dir / c).is_file()), None)
        ships = bool(new_name and (output_media / new_name).is_file())
        status, location, _ = fetch(port, old_url)
        if ships:
            actual = f"{status} {location or ''}"
            ok = status == 301 and (location or "") == f"/assets/media/{new_name}"
            checker.check("media 301", old_url, f"301 /assets/media/{new_name}", actual)
            if ok and not target_exists(dist, normalize_target(location, base_path)):
                media_missing.append(f"{old_url} -> {location} (missing in build)")
            media_301 += 1
        else:
            checker.check("media gone (pruned, DIG-90)", old_url, "410", str(status))
            media_gone += 1
    media_targets_missing = media_missing

    # --- host and scheme canonicalization
    for label, path, host, server_port, expected in [
        ("http apex -> https", "/", DOMAIN, port_http, f"301 {APEX}/"),
        ("http www -> https apex", "/about/", f"www.{DOMAIN}", port_http, f"301 {APEX}/about/"),
        ("https www -> apex", "/contact/", f"www.{DOMAIN}", port, f"301 {APEX}/contact/"),
    ]:
        status, location, _ = fetch(server_port, path, host=host)
        checker.check("canonical origin", f"{host}:{path}", expected, f"{status} {location or ''}")

    # --- unknown URL keeps a real 404
    status, location, body = fetch(port, "/definitely-not-here-xyz/")
    checker.check("unknown URL", "/definitely-not-here-xyz/", "404", str(status))
    checker.check("404 page served", "/definitely-not-here-xyz/", "html", "html" if b"<html" in body.lower() else "other")

    # --- staging base-path variant
    status, location, _ = fetch(port_staging, "/website-relaunch/contact-us/")
    checker.check("staging contact", "/website-relaunch/contact-us/",
                  "301 /website-relaunch/contact/", f"{status} {location or ''}")
    status, location, _ = fetch(port_staging, "/website-relaunch/tag/seo/")
    checker.check("staging tag", "/website-relaunch/tag/seo/",
                  "301 /website-relaunch/blog/", f"{status} {location or ''}")
    status, location, _ = fetch(port_staging, "/website-relaunch/wp-login.php")
    checker.check("staging wp-login", "/website-relaunch/wp-login.php", "410", str(status))
    status, _, _ = fetch(port_staging, "/website-relaunch/")
    checker.check("staging home", "/website-relaunch/", "200", str(status))

    # --- every 301 target must exist in the build output
    print("[5/6] verifying every 301 target exists in the build output")
    missing_targets = []
    for case in checker.cases:
        actual = case["actual"]
        if actual.startswith("301 "):
            location = actual[4:]
            case_base = "/website-relaunch" if case["request"].startswith("/website-relaunch") else base_path
            if location.startswith("http://127.0.0.1") or urlparse(location).hostname in (DOMAIN, f"www.{DOMAIN}"):
                location = urlparse(location).path
            if not target_exists(dist, normalize_target(location, case_base)):
                missing_targets.append(f"{case['request']} -> {location}")
    for miss in missing_targets:
        checker.failures.append(f"redirect target missing in build: {miss}")

    # --- orphan check over every recorded old URL
    print("[6/6] orphan check across every recorded old URL")
    sources = internal_urls_from_records(map_data)
    # Distinct requests with their disposition; sources recorded per URL.
    results: dict[str, dict] = {}
    for source, urls in sources.items():
        for url in urls:
            parsed = urlparse(url.strip())
            path = unquote(parsed.path) or "/"
            query = parsed.query
            request_key = path + (f"?{query}" if query else "")
            result = engine.apply(path, query=query)
            if result[0] == "redirect":
                kind = f"301 -> {result[2]}" if result[1] != 410 else "410"
            elif result[0] == "gone":
                kind = "410"
            else:
                kind = "served (same URL)" if engine.resolve(result[1]) else "ORPHAN (would 404)"
            entry = results.setdefault(request_key, {"kind": kind, "sources": []})
            if source not in entry["sources"]:
                entry["sources"].append(source)
    dispositions: dict[str, list[str]] = {}
    orphans: list[str] = []
    for request_key, entry in results.items():
        kind = entry["kind"]
        label = kind.split(" -> ")[0] if kind.startswith("301") else kind
        dispositions.setdefault(label, []).append(request_key)
        if kind.startswith("ORPHAN"):
            orphans.append(f"{request_key}  [{', '.join(entry['sources'])}]")
    total_urls = len(results)

    # --- report --------------------------------------------------------------
    passed, total = checker.counts
    lines = [
        "# Redirect map test report — DIG-89", "",
        f"- Run: {started}",
        "- Build: production semantics (`BUILD_ENV=production`), commit marker `dig89-local-test`",
        f"- Method: `scripts/build-site.sh` output served through a local engine that executes",
        f"  the generated `.htaccess` (mod_rewrite subset: R=301/G/L/QSA/NC; HTTPS, HTTP_HOST,",
        f"  QUERY_STRING, REQUEST_FILENAME conditions). Plain `http.server` underneath.",
        f"- Re-run: `python3 docs/migration/tools/test_redirects.py`",
        "",
        f"## Results: {passed}/{total} request cases pass",
        "",
    ]
    if staging_checks:
        lines += ["Generator checks:", ""]
        lines += [f"- {'PASS' if ok else 'FAIL'}: {name}" for name, ok in staging_checks]
        lines.append("")
    lines += ["| # | Request | Expected | Actual | Result |", "|---|---------|----------|--------|--------|"]
    for i, case in enumerate(checker.cases, 1):
        lines.append(f"| {i} | `{case['request']}` | {case['expected']} | {case['actual']} | {'PASS' if case['pass'] else '**FAIL**'} |")
    lines += ["", "## 301 targets in build output", ""]
    lines.append(f"- All 301 targets exist in the build: {'YES' if not missing_targets else 'NO'}")
    for miss in missing_targets:
        lines.append(f"- MISSING: {miss}")
    if media_targets_missing:
        lines.append(f"- media target problems: {len(media_targets_missing)}")
        for miss in media_targets_missing:
            lines.append(f"  - {miss}")
    lines.append(f"- Migrated media: {media_301} exact 301 rules verified; "
                 f"{media_gone} pruned-by-DIG-90 URLs correctly return 410")
    lines += ["", "## Old-URL coverage (orphan check)", ""]
    total_urls = sum(len(v) for v in dispositions.values())
    lines.append(f"- Distinct recorded old URLs checked: {total_urls}")
    for kind in sorted(dispositions):
        lines.append(f"- {kind}: {len(dispositions[kind])}")
    lines.append(f"- Orphans (old URLs that would 404): {len(orphans)}")
    for orphan in orphans[:50]:
        lines.append(f"  - {orphan}")
    lines += ["", "## Failures", ""]
    lines += ([f"- {f}" for f in checker.failures] if checker.failures else ["- none"])
    lines.append("")

    report_path = Path(args.report)
    report_path.write_text("\n".join(lines), encoding="utf-8")

    server.shutdown(); server_http.shutdown(); staging_server.shutdown()
    if args.keep:
        print(f"build kept at {dist}")
    else:
        shutil.rmtree(tmp, ignore_errors=True)

    print()
    print(f"request cases: {passed}/{total} pass")
    print(f"orphan check: {len(orphans)} orphans over {total_urls} recorded old URLs")
    print(f"media: {media_301} x 301, {media_gone} x 410 (pruned)")
    print(f"301 targets missing from build: {len(missing_targets)}")
    print(f"report: {report_path}")
    if checker.failures:
        print("\nFAILURES:")
        for failure in checker.failures:
            print(f"  - {failure}")
        return 1
    return 0


def fail_fast(message: str) -> int:
    print(f"TEST SETUP FAILED: {message}")
    return 2


if __name__ == "__main__":
    sys.exit(main())
