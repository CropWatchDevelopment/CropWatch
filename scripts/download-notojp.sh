#!/usr/bin/env bash
# Download NotoSansJP-Regular.ttf into static/fonts
set -euo pipefail
OUT_DIR="$(pwd)/static/fonts"
URL="https://github.com/googlefonts/noto-cjk/raw/main/Sans/TTF/Japanese/NotoSansJP-Regular.otf"
# Note: the repository contains .otf; PDFKit supports OTF too, but the code expects .ttf filename.
OUT_FILE="$OUT_DIR/NotoSansJP-Regular.otf"
mkdir -p "$OUT_DIR"
if command -v curl >/dev/null 2>&1; then
  curl -L -o "$OUT_FILE" "$URL"
elif command -v wget >/dev/null 2>&1; then
  wget -O "$OUT_FILE" "$URL"
else
  echo "Install curl or wget to run this script." >&2
  exit 1
fi
# Inform the user
echo "Downloaded $OUT_FILE"

echo "If you need a .ttf file instead of .otf, convert it using fonttools or obtain the .ttf distribution." 
