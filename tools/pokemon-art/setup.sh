#!/usr/bin/env bash
# Installs headless Blender (and Pillow) for the Pokémon art scripts if missing.
set -euo pipefail
VER=5.2.2
DIR="${BLENDER_DIR:-$HOME/tools}"
BIN="$DIR/blender-$VER-linux-x64/blender"
if [ ! -x "$BIN" ]; then
  mkdir -p "$DIR"
  curl -fSL "https://download.blender.org/release/Blender5.2/blender-$VER-linux-x64.tar.xz" -o "$DIR/blender.tar.xz"
  tar -xf "$DIR/blender.tar.xz" -C "$DIR"
  rm "$DIR/blender.tar.xz"
fi
python3 -c "import PIL" 2>/dev/null || pip install --quiet pillow
echo "Blender: $BIN"
