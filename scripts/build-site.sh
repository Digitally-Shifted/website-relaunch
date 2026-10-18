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

echo "Build OK: $OUT_DIR (sha=$BUILD_SHA env=$BUILD_ENV)"
