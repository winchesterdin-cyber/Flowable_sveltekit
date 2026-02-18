#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$ROOT_DIR/scripts/enhancement-gates.sh"
TEST_DIR="$ROOT_DIR/.reports/self-test"

assert_contains() {
	local file="$1"
	local text="$2"
	if ! grep -Fq "$text" "$file"; then
		echo "ASSERTION FAILED: expected '$text' in $file" >&2
		exit 1
	fi
}

cleanup() {
	rm -rf "$TEST_DIR"
}

cleanup
mkdir -p "$TEST_DIR"

bash -n "$TARGET"

"$TARGET" --list-gates >"$TEST_DIR/list-gates.txt"
assert_contains "$TEST_DIR/list-gates.txt" "frontend:unit"

"$TARGET" --profile quick --dry-run --json --junit --report-dir "$TEST_DIR/run1" >/dev/null
LATEST_JSON="$(ls -1 "$TEST_DIR/run1"/*.json | tail -n 1)"
LATEST_JUNIT="$(ls -1 "$TEST_DIR/run1"/*.junit.xml | tail -n 1)"
assert_contains "$LATEST_JSON" '"profile": "quick"'
assert_contains "$LATEST_JUNIT" '<testsuite name="enhancement-gates"'

"$TARGET" --profile quick --dry-run --report-dir "$TEST_DIR/run2" --only docs >/dev/null
LATEST_MD="$(ls -1 "$TEST_DIR/run2"/*.md | tail -n 1)"
assert_contains "$LATEST_MD" "Documentation freshness gate"
assert_contains "$LATEST_MD" "Frontend format check"
assert_contains "$LATEST_MD" "selection filters"

if "$TARGET" --profile quick --dry-run --only invalid-gate --report-dir "$TEST_DIR/run3" >"$TEST_DIR/invalid.log" 2>&1; then
	echo "ASSERTION FAILED: invalid gate command should fail" >&2
	exit 1
fi
assert_contains "$TEST_DIR/invalid.log" "Unknown gate id"

echo "Self-tests completed successfully."
