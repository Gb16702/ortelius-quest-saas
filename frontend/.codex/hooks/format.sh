#!/bin/bash
# Codex PostToolUse hook: best-effort format for files changed through apply_patch.

payload=$(cat)

extract() {
    if command -v jq >/dev/null 2>&1; then
        printf '%s' "$payload" | jq -r "$1" 2>/dev/null
    else
        printf '%s' "$payload" | python3 -c "$2" 2>/dev/null
    fi
}

cwd=$(extract '.cwd // empty' 'import json,sys; d=json.load(sys.stdin); print(d.get("cwd",""))')
[ -z "$cwd" ] && cwd=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$cwd" ] && exit 0

cd "$cwd" || exit 0
project_dir=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$project_dir" ] && project_dir="$cwd"

command_text=$(extract '.tool_input.command // empty' 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command",""))')
[ -z "$command_text" ] && exit 0

# Extract files from apply_patch hunks. Deleted files are skipped because they no longer exist.
printf '%s\n' "$command_text" |
    awk '/^\*\*\* (Add|Update) File: / { sub(/^\*\*\* (Add|Update) File: /, ""); print }' |
    while IFS= read -r file_path; do
        [ -z "$file_path" ] && continue

        case "$file_path" in
            /*) abs_path="$file_path" ;;
            *) abs_path="$project_dir/$file_path" ;;
        esac

        [ ! -f "$abs_path" ] && continue

        case "$abs_path" in
            "$project_dir"/*) ;;
            *) continue ;;
        esac

        case "$abs_path" in
            *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc|*.css) ;;
            *) continue ;;
        esac

        bun biome format --write "$abs_path" >/dev/null 2>&1
    done

exit 0
