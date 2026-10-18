#!/usr/bin/env bash
# Subset the self-hosted Raleway variable font to the latin set the site uses.
#
# The stock variable font ships 936 mapped codepoints (Cyrillic, Greek,
# Vietnamese and symbol blocks included). The site text is English, so every
# extra glyph is download weight on the critical path: the font is preloaded
# and gates the visible text swap. This script cuts the font to ASCII, Latin-1
# and the punctuation the pages use, keeps the full wght 100-900 variable
# axis and every layout feature (kerning, ligatures), and keeps the name
# table (SIL OFL 1.1 licence metadata stays with the font).
#
# Requirements: python3 with fonttools and brotli (pip install fonttools brotli).
#
# Usage: scripts/subset-font.sh
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FONT="$SRC_DIR/public/fonts/raleway-variable.woff2"
TMP="$(mktemp --suffix=.woff2)"

PYTHON="${PYTHON:-python3}"
if ! "$PYTHON" -c 'import fontTools, brotli' 2>/dev/null; then
  echo "fonttools and brotli are required: pip install fonttools brotli" >&2
  exit 1
fi

# Keep: ASCII, Latin-1 supplement, general punctuation in use (dashes,
# curly quotes, ellipsis), euro sign, trademark. Everything the rendered
# pages can emit today, plus headroom for copy rewrites.
UNICODES="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-2019,U+201C-201D,U+2026,U+20AC,U+2122"

"$PYTHON" -m fontTools.subset "$FONT" \
  --output-file="$TMP" \
  --flavor=woff2 \
  --unicodes="$UNICODES" \
  --layout-features='*' \
  --name-IDs='*' \
  --name-languages='*' \
  --notdef-outline

BEFORE=$(stat -c%s "$FONT")
AFTER=$(stat -c%s "$TMP")
"$PYTHON" - "$TMP" <<'PY'
import sys
from fontTools.ttLib import TTFont
f = TTFont(sys.argv[1])
axes = {a.axisTag: (a.minValue, a.maxValue) for a in f['fvar'].axes}
cmap = f.getBestCmap()
required = [0x41, 0x61, 0x30, 0x2014, 0x00E9, 0x00A0]
missing = [hex(c) for c in required if c not in cmap]
assert 'wght' in axes and axes['wght'] == (100.0, 900.0), f"wght axis lost: {axes}"
assert not missing, f"required codepoints missing: {missing}"
print(f"subset OK: {len(cmap)} codepoints, wght axis {axes['wght'][0]:.0f}-{axes['wght'][1]:.0f} kept")
PY

mv "$TMP" "$FONT"
echo "raleway-variable.woff2: $BEFORE -> $AFTER bytes"
