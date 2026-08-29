#!/bin/bash
# Codex Stop hook: run the repo's final validation before Codex ends the turn.
# Exit 2 with stderr feedback to ask Codex to continue and fix failures.

payload=$(cat)

if command -v jq >/dev/null 2>&1; then
    cwd=$(printf '%s' "$payload" | jq -r '.cwd // empty' 2>/dev/null)
else
    cwd=$(printf '%s' "$payload" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("cwd",""))' 2>/dev/null)
fi

[ -z "$cwd" ] && cwd=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$cwd" ] || ! cd "$cwd"; then
    echo "final-check.sh: unable to resolve Codex cwd" >&2
    exit 2
fi

run_with_timeout() {
    local secs="$1"; shift
    if command -v timeout >/dev/null 2>&1; then
        timeout "$secs" "$@"
    elif command -v gtimeout >/dev/null 2>&1; then
        gtimeout "$secs" "$@"
    else
        perl -e 'alarm shift; exec @ARGV' "$secs" "$@"
    fi
}

handle_failure() {
    local step="$1"
    local code="$2"
    local out="$3"
    if [ "$code" -eq 124 ] || [ "$code" -eq 142 ]; then
        echo "final-check.sh: $step exceeded timeout" >&2
        exit 2
    fi
    echo "$out" | tail -60 >&2
    exit 2
}

output=$(run_with_timeout 30 bun run ci:check 2>&1)
exit_code=$?
[ $exit_code -ne 0 ] && handle_failure "bun run ci:check" "$exit_code" "$output"

# CI runs `bun run typecheck:full`, including React Router type generation.
# Local hooks use `typecheck` so they stay fast and avoid known typegen hangs.
output=$(run_with_timeout 30 bun run typecheck 2>&1)
exit_code=$?
[ $exit_code -ne 0 ] && handle_failure "bun run typecheck" "$exit_code" "$output"

exit 0
