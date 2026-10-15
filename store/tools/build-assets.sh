#!/bin/sh
# Renders the store screenshots and promo tile with headless Chrome. Usage: store/tools/build-assets.sh <work-dir>
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${1:?work dir required}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$WORK/harness" "$ROOT/store/assets"
cp "$ROOT/panel.js" "$ROOT/store/tools/fake-chrome.js" "$ROOT/store/tools/scene.js" "$WORK/harness/"
sed 's#<script src="panel.js"></script>#<script src="fake-chrome.js"></script><script src="panel.js"></script><script src="scene.js"></script>#' \
  "$ROOT/panel.html" > "$WORK/harness/panel.html"

shot() { # <url> <out.png> <width> <height>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$WORK/profile" \
    --force-device-scale-factor=1 --virtual-time-budget=3000 \
    --window-size="$3,$4" --screenshot="$2" "$1" 2>/dev/null
}

shot "file://$WORK/harness/panel.html#detail"  "$ROOT/store/assets/screenshot-1-detail.png"  1280 800
shot "file://$WORK/harness/panel.html#domains" "$ROOT/store/assets/screenshot-2-filter.png"  1280 800
shot "file://$ROOT/store/tools/promo-tile.html" "$ROOT/store/assets/promo-small-440x280.png" 440 280
