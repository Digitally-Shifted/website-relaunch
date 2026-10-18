#!/usr/bin/env bash
# Assemble the publishable site into the output directory.
#
# Usage: scripts/build-site.sh <output-dir>
#
# The build injects the deploy identity into the build markers, so every
# deployment states which commit and environment it serves. Replace this
# script's body with the real static-site build when DIG-15/DIG-16 add the
# framework; keep the contract: one output directory, checks pass or exit 1.
set -euo pipefail

OUT_DIR="${1:?usage: build-site.sh <output-dir>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BUILD_SHA="${BUILD_SHA:-unknown}"
BUILD_TIME="${BUILD_TIME:-unknown}"
BUILD_ENV="${BUILD_ENV:-staging}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Static source files. Add build-tool output here when the framework lands.
cp "$SRC_DIR/index.html" "$OUT_DIR/index.html"
cp "$SRC_DIR/404.html" "$OUT_DIR/404.html" 2>/dev/null || true
if [ -d "$SRC_DIR/assets" ]; then
  cp -r "$SRC_DIR/assets" "$OUT_DIR/assets"
fi
touch "$OUT_DIR/.nojekyll"

# Inject build identity into the marker block.
if grep -q "__BUILD_SHA__" "$OUT_DIR/index.html"; then
  sed -i "s/__BUILD_SHA__/$BUILD_SHA/g; s/__BUILD_TIME__/$BUILD_TIME/g; s/__BUILD_ENV__/$BUILD_ENV/g" "$OUT_DIR/index.html"
fi

# --- checks ----------------------------------------------------------------
fail() { echo "CHECK FAILED: $1" >&2; exit 1; }

[ -s "$OUT_DIR/index.html" ] || fail "index.html missing or empty in output"
grep -q "__BUILD_" "$OUT_DIR/index.html" && fail "unreplaced build placeholder left in output"

# Every local href/src in index.html must exist in the output.
while IFS= read -r ref; do
  path="${ref%%\#*}"
  [ -n "$path" ] || continue
  case "$path" in
    https://*|http://*|mailto:*|data:*) continue ;;
  esac
  [ -f "$OUT_DIR/$path" ] || fail "local reference '$ref' not found in output"
done < <(grep -oE '(href|src)="[^"]+"' "$OUT_DIR/index.html" | sed -E 's/^(href|src)="//; s/"$//')

echo "Build OK: $OUT_DIR (sha=$BUILD_SHA env=$BUILD_ENV)"
