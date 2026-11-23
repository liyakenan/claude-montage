#!/bin/bash
# Claude Montage - installer for Mac. Safe to run again: it only adds what is missing.
set -e
REPO="https://github.com/liyakenan/claude-montage"
DIR="$HOME/claude-montage"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Claude Montage - installing into $DIR"
echo "This takes 5-15 minutes depending on the internet speed. Keep the computer awake."
mkdir -p "$DIR"

case "$(uname -m)" in
  arm64) ARCH=arm64 ;;
  x86_64) ARCH=x64 ;;
  *) echo "INSTALL FAILED: unsupported Mac type $(uname -m)"; exit 1 ;;
esac

if [ ! -x "$DIR/.node/bin/node" ]; then
  echo ""
  echo "[0/5] Downloading Node.js (the engine that runs the tools)..."
  NODE_URL="https://nodejs.org/dist/latest-v22.x"
  LINE="$(curl -fsSL "$NODE_URL/SHASUMS256.txt" | grep "darwin-$ARCH.tar.gz")"
  FILE="$(echo "$LINE" | awk '{print $2}')"
  SUM="$(echo "$LINE" | awk '{print $1}')"
  curl -fsSL -o "$TMP/node.tgz" "$NODE_URL/$FILE"
  if [ "$(shasum -a 256 "$TMP/node.tgz" | awk '{print $1}')" != "$SUM" ]; then
    echo "INSTALL FAILED: the Node.js download is damaged. Run the installer again."
    exit 1
  fi
  rm -rf "$DIR/.node" && mkdir -p "$DIR/.node"
  tar -xzf "$TMP/node.tgz" -C "$DIR/.node" --strip-components=1
fi

curl -fsSL -o "$TMP/kit.tgz" "$REPO/archive/refs/heads/main.tar.gz"
tar -xzf "$TMP/kit.tgz" -C "$DIR" --strip-components=1
chmod +x "$DIR/m"

export PATH="$DIR/.node/bin:$PATH"
exec "$DIR/.node/bin/node" "$DIR/tools/setup.mjs"
