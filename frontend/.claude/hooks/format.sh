#!/bin/bash
# PostToolUse hook: format the single file Claude just edited.
#
# Reads the hook payload from stdin (JSON) and extracts tool_input.file_path,
# then runs `bun biome format --write <file>`. Per-file formatting is ~60ms,
# vs ~1s for the whole repo — keeps the turn snappy.
#
# Always exits 0: formatting is best-effort and must never block the turn.

cd "$CLAUDE_PROJECT_DIR" || exit 0

payload=$(cat)

# Extract tool_input.file_path. Prefer jq; fall back to python3 (always on macOS).
if command -v jq >/dev/null 2>&1; then
    file_path=$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
else
    file_path=$(printf '%s' "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null)
fi

[ -z "$file_path" ] && exit 0
[ ! -f "$file_path" ] && exit 0

# Only format files inside the project (safety: ignore edits to ~/.claude/, etc.).
case "$file_path" in
    "$CLAUDE_PROJECT_DIR"/*) ;;
    *) exit 0 ;;
esac

# Restrict to extensions Biome handles. Anything else (md, sh, yaml, env) is a no-op.
case "$file_path" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.css) ;;
    *) exit 0 ;;
esac

bun biome format --write "$file_path" >/dev/null 2>&1

exit 0
