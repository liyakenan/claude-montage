#!/bin/sh
# Claude Montage launcher (Mac / Linux / Git Bash)
DIR="$(cd "$(dirname "$0")" && pwd)"
[ -d "$DIR/.node/bin" ] && PATH="$DIR/.node/bin:$PATH"
[ -f "$DIR/.node/node.exe" ] && PATH="$DIR/.node:$PATH"
export PATH
exec node "$DIR/tools/cli.mjs" "$@"
