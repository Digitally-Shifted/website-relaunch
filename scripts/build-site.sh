#!/usr/bin/env bash
# Assemble the publishable site into the output directory.
#
# Usage: scripts/build-site.sh <output-dir>
#
# The build injects the deploy identity into the build markers, so every
# deployment states which commit and environment it serves. Replace this
# script's body with the real static-site build when the framework lands;
# keep the contract: one output directory, checks pass or exit 1.
set -euo pipefail

OUT_DIR="${1:?usage: build-site.sh <output-dir>}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The output directory may sit inside the source tree (CI builds into
# ./site). Never read from it while assembling.
mkdir -p "$OUT_DIR"
OUT_ABS="$(cd "$OUT_DIR" && pwd -P)"
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

BUILD_SHA="${BUILD_SHA:-unknown}"
BUILD_TIME="${BUILD_TIME:-unknown}"
BUILD_ENV="${BUILD_ENV:-staging}"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Static source files. Add build-tool output here when the framework lands.
cp "$SRC_DIR/index.html" "$OUT_DIR/index.html"
cp "$SRC_DIR/404.html" "$OUT_DIR/404.html" 2>/dev/null || true

# Content pages (migrated site structure): every .html outside tool/doc dirs.
( cd "$SRC_DIR" && find . -name '*.html' \
    -not -path './docs/*' -not -path './analytics/*' -not -path './scripts/*' \
    -not -path './.github/*' -not -path './node_modules/*' -not -path './.git/*' \
    -not -path './index.html' \
    -print0 ) |
while IFS= read -r -d '' f; do
  src="$(realpath -m -- "$SRC_DIR/$f")"
  case "$src" in "$OUT_ABS"/*) continue ;; esac
  dest="$OUT_DIR/${f#./}"
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
done

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

# Every local href/src in every output page must exist in the output.
found_error=0
while IFS= read -r -d '' page; do
  page_rel="${page#"$OUT_DIR"/}"
  while IFS= read -r ref; do
    path="${ref%%\#*}"
    path="${path%%\?*}"
    [ -n "$path" ] || continue
    case "$path" in
      https://*|http://*|mailto:*|tel:*|data:*|//*) continue ;;
      /*) fail "page '$page_rel' uses root-relative path '$ref' (project Pages needs relative paths)" ;;
    esac
    # Resolve relative to the page directory.
    dir="$(dirname "$page_rel")"
    target="$(python3 -c "import os,sys; print(os.path.normpath(os.path.join(sys.argv[1], sys.argv[2])))" "$dir" "$path")"
    [ -e "$OUT_DIR/$target" ] || { echo "CHECK FAILED: local reference '$ref' in '$page_rel' not found in output" >&2; found_error=1; }
  done < <(grep -oE '(href|src)="[^"]+"' "$page" | sed -E 's/^(href|src)="//; s/"$//')
done < <(find "$OUT_DIR" -name '*.html' -print0)
[ "$found_error" -eq 0 ] || exit 1

echo "Build OK: $OUT_DIR (sha=$BUILD_SHA env=$BUILD_ENV)"
