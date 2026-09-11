#!/usr/bin/env bash
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$HOME/.claude/skills/pixelsmith}"
cd "$SKILL_DIR" && npm install --omit=dev
mkdir -p "$(dirname "$TARGET")"
ln -sfn "$SKILL_DIR" "$TARGET"
echo "pixelsmith installed at $TARGET (symlink → $SKILL_DIR)"
