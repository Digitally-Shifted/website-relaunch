#!/usr/bin/env bash
# Build the site and verify the output.
#
# Usage: scripts/build-site.sh <output-dir>
#
# The site is an Astro static build (src/pages) styled with the DS design
# tokens (brand/tokens). This wrapper keeps the DIG-64 deploy contract:
# one output directory, checks pass or exit 1, and every deployment states
# which commit and environment it serves through the build markers.
#
# Environment:
#   BUILD_SHA, BUILD_TIME, BUILD_ENV - injected into the page markers.
#   BUILD_ENV=staging also builds under the GitHub Pages project prefix
#   (/website-relaunch) and sets noindex on every page.
set -euo pipefail

OUT_DIR="${1:?usage: build-site.sh <output-dir>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BUILD_SHA="${BUILD_SHA:-unknown}"
BUILD_TIME="${BUILD_TIME:-unknown}"
BUILD_ENV="${BUILD_ENV:-staging}"

cd "$SRC_DIR"

# --- dependencies -----------------------------------------------------------
if ! command -v npm >/dev/null 2>&1; then
  echo "CHECK FAILED: npm is required to build the site" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  npm ci
fi

# --- build environment ------------------------------------------------------
# Staging serves under the GitHub Pages project path and is noindex.
if [ "$BUILD_ENV" = "staging" ]; then
  export PUBLIC_BASE_PATH="${PUBLIC_BASE_PATH:-/website-relaunch}"
  export PUBLIC_BUILD_ENV="${PUBLIC_BUILD_ENV:-staging}"
else
  export PUBLIC_BASE_PATH="${PUBLIC_BASE_PATH:-}"
  export PUBLIC_BUILD_ENV="${PUBLIC_BUILD_ENV:-production}"
fi

npm run build

# --- assemble output --------------------------------------------------------
rm -rf "$OUT_DIR"
cp -r dist "$OUT_DIR"
touch "$OUT_DIR/.nojekyll"

# Migrated legacy content pages (DIG-73): blog and old posts keep serving
# from legacy-static/ until they are ported to Astro routes. The four
# routes that the Astro app implements (services, contact, thank-you,
# privacy) are not in legacy-static; their pre-port versions are kept in
# docs/migration/generated/ for reference.
if [ -d "$SRC_DIR/legacy-static" ]; then
  cp -r "$SRC_DIR/legacy-static/." "$OUT_DIR/"
  # Prune legacy media nothing references (DIG-90). The old-site media
  # library keeps 62 MB of files in the repo for the migration record, but
  # only files a legacy page or stylesheet actually links belong in the
  # deploy output. Deletes run on the output copy only; legacy-static/ is
  # never modified.
  while IFS= read -r media_file; do
    name=$(basename "$media_file")
    if ! grep -rqF "$name" "$SRC_DIR/legacy-static" --include='*.html' --include='*.css'; then
      rm -f "$media_file"
    fi
  done < <(find "$OUT_DIR/assets/media" -type f 2>/dev/null)
fi

# Redirect map (DIG-89): generate the hosting redirect file into the output.
# Production hosts this on LiteSpeed; on GitHub Pages staging it ships inert.
# Runs after the DIG-90 media prune, so 301 rules exist only for upload files
# that really ship in this output; pruned media URLs fall to the 410 fallback.
python3 "$SRC_DIR/docs/migration/tools/generate_redirects.py" \
  --map "$SRC_DIR/docs/migration/redirect-map.json" \
  --media-manifest "$SRC_DIR/docs/migration/media-manifest.json" \
  --media-dir "$SRC_DIR/legacy-static/assets/media" \
  --media-output-dir "$OUT_DIR/assets/media" \
  --base-path "${PUBLIC_BASE_PATH:-}" \
  --out "$OUT_DIR/.htaccess"

# XML sitemap (DIG-118): the Astro sitemap lists only Astro routes. Append
# the legacy pages that serve as-is (redirect map sameUrl) with their real
# lastmod dates from the map. The map is the single source of truth; update
# a page's lastmod there whenever its content changes.
python3 "$SRC_DIR/docs/migration/tools/generate_legacy_sitemap.py" \
  --map "$SRC_DIR/docs/migration/redirect-map.json" \
  --base-path "${PUBLIC_BASE_PATH:-}" \
  --out-dir "$OUT_DIR"

# Analytics on legacy pages (DIG-88). The migrated HTML predates the Astro
# layout, so it has no analytics wiring. Ship the standalone module and
# inject it, plus the guarded init, into every page that lacks the module.
# Astro pages already carry the bundled module and are skipped.
mkdir -p "$OUT_DIR/analytics"
cp "$SRC_DIR/analytics/ds-analytics.js" "$OUT_DIR/analytics/ds-analytics.js"
GA4_ID="${PUBLIC_GA4_ID:-}"
ANALYTICS_BASE="${PUBLIC_BASE_PATH:-}"
ANALYTICS_BASE="${ANALYTICS_BASE%/}"
python3 - "$OUT_DIR" "$GA4_ID" "$ANALYTICS_BASE" <<'PY'
import sys, pathlib

out_dir = pathlib.Path(sys.argv[1])
ga4_id = sys.argv[2]
base = sys.argv[3]
snippet = (
    '<script defer src="' + base + '/analytics/ds-analytics.js"></script>\n'
    '<script defer>window.addEventListener("DOMContentLoaded",function(){'
    'var id="' + ga4_id + '";'
    'if(window.DSAnalytics&&/^G-[A-Z0-9]{6,12}$/.test(id)){'
    'window.DSAnalytics.init({measurementId:id});}});</script>'
)
changed = 0
for html in out_dir.rglob('*.html'):
    text = html.read_text(encoding='utf-8')
    if 'DSAnalytics' in text or '</head>' not in text:
        continue
    html.write_text(text.replace('</head>', snippet + '\n</head>', 1), encoding='utf-8')
    changed += 1
print(f'analytics injected into {changed} legacy page(s)')
PY

# Inject build identity into the marker block (every HTML file).
find "$OUT_DIR" -name '*.html' -type f -exec sed -i \
  "s/__BUILD_SHA__/$BUILD_SHA/g; s/__BUILD_TIME__/$BUILD_TIME/g; s/__BUILD_ENV__/$BUILD_ENV/g" {} +

# --- checks -----------------------------------------------------------------
fail() { echo "CHECK FAILED: $1" >&2; exit 1; }

[ -s "$OUT_DIR/index.html" ] || fail "index.html missing or empty in output"

if grep -rq "__BUILD_" "$OUT_DIR" --include='*.html'; then
  fail "unreplaced build placeholder left in output"
fi

# Every local href/src in every HTML file must exist in the output.
# Absolute links carry the staging base path; strip it before resolving.
BASE_PATH="${PUBLIC_BASE_PATH:-/}"
while IFS= read -r html_file; do
  html_rel="${html_file#"$OUT_DIR"/}"
  html_dir="$(dirname "$html_file")"
  while IFS= read -r ref; do
    path="${ref%%\#*}"
    path="${path%%\?*}"
    [ -n "$path" ] || continue
    case "$path" in
      https://*|http://*|mailto:*|tel:*|data:*|//*) continue ;;
    esac
    case "$path" in
      /*) resolved="$OUT_DIR/${path#"$BASE_PATH"}" ;;
      *)  resolved="$html_dir/$path" ;;
    esac
    if [ -f "$resolved" ]; then
      continue
    elif [ -d "$resolved" ] && [ -f "$resolved/index.html" ]; then
      continue
    fi
    fail "local reference '$ref' in $html_rel not found in output"
  done < <(grep -oE '(href|src)="[^"]+"' "$html_file" | sed -E 's/^(href|src)="//; s/"$//')
done < <(find "$OUT_DIR" -name '*.html' -type f)

# Redirect map (DIG-89/DIG-91): stubs ship, destinations resolve, no orphan.
node scripts/test-redirects.mjs --dir "$OUT_DIR"

echo "Build OK: $OUT_DIR (sha=$BUILD_SHA env=$BUILD_ENV)"
