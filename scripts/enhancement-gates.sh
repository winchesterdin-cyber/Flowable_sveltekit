#!/usr/bin/env bash
set -euo pipefail

# Enhanced quality gate runner.
# This script centralizes repeatable validation workflows with structured logs,
# deterministic reports, and explicit gate controls for local and CI usage.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="full"
INSTALL_DEPS=false
DRY_RUN=false
SKIP_E2E=false
CONTINUE_ON_ERROR=false
VERBOSE=false
EMIT_JSON=false
EMIT_JUNIT=false
FAIL_ON_WARN=false
COLOR=true
RETRIES=1
TIMEOUT_SECONDS=0
MAX_FAILURES=0
ONLY_GATES=()
SKIP_GATES=()
REPORT_DIR_DEFAULT="$ROOT_DIR/.reports"
REPORT_DIR="$REPORT_DIR_DEFAULT"
LOG_DIR=""
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_FILE=""
JSON_REPORT_FILE=""
JUNIT_REPORT_FILE=""
RUN_LOG_FILE=""
EXIT_TRAPPED=false

# Gate bookkeeping for deterministic summaries.
GATE_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0
SKIP_COUNT=0
TOTAL_DURATION=0

# Arrays store per-gate metadata for markdown/json output.
declare -a GATE_NAMES=()
declare -a GATE_STATUSES=()
declare -a GATE_DURATIONS=()
declare -a GATE_COMMANDS=()
declare -a GATE_NOTES=()

declare -a SUPPORTED_GATES=(
	"docs"
	"frontend:format"
	"frontend:lint"
	"frontend:check"
	"frontend:unit"
	"backend:test"
	"frontend:e2e"
)

usage() {
	cat <<USAGE
Usage: scripts/enhancement-gates.sh [options]

Options:
  --profile <quick|full|ci>  Gate profile (default: full)
  --install                  Install required dependencies before checks
  --skip-e2e                 Skip frontend E2E smoke tests in full/ci profile
  --continue-on-error        Continue running remaining gates after a failure
  --report-dir <path>        Override report output directory (default: .reports)
  --json                     Emit JSON summary report in addition to markdown
  --junit                    Emit JUnit XML summary report
  --fail-on-warn             Treat warning gates as failures
  --max-failures <n>         Stop execution after n failed gates (0 disables)
  --only <gate[,gate...]>    Run only listed gate ids
  --skip <gate[,gate...]>    Skip listed gate ids
  --retries <n>              Retry each gate command up to n attempts (default: 1)
  --timeout <seconds>        Apply command timeout when GNU timeout exists
  --no-color                 Disable ANSI color output in terminal logs
  --list-gates               Print supported gate ids and exit
  --verbose                  Echo additional debug detail
  --dry-run                  Print commands without executing
  --help                     Show this message
USAGE
}

log() {
	local level="$1"
	shift
	local msg="$*"
	local level_render="$level"
	if [[ "$COLOR" == true ]]; then
		case "$level" in
		INFO) level_render="\033[1;34m$level\033[0m" ;;
		WARN) level_render="\033[1;33m$level\033[0m" ;;
		ERROR) level_render="\033[1;31m$level\033[0m" ;;
		esac
	fi
	printf '[enhancement-gates][%s][%b] %s\n' "$(date +%H:%M:%S)" "$level_render" "$msg"
	if [[ -n "$RUN_LOG_FILE" ]]; then
		printf '[enhancement-gates][%s][%s] %s\n' "$(date +%H:%M:%S)" "$level" "$msg" >>"$RUN_LOG_FILE"
	fi
}

append_report() {
	printf '%s\n' "$*" >>"$REPORT_FILE"
}

list_gates() {
	printf '%s\n' "Supported gates:"
	local gate
	for gate in "${SUPPORTED_GATES[@]}"; do
		printf ' - %s\n' "$gate"
	done
}

normalize_csv_list() {
	local input="$1"
	local -n output_ref=$2
	output_ref=()
	local part
	IFS=',' read -r -a parts <<<"$input"
	for part in "${parts[@]}"; do
		part="${part//[[:space:]]/}"
		[[ -n "$part" ]] && output_ref+=("$part")
	done
}

record_gate() {
	local name="$1"
	local status="$2"
	local duration="$3"
	local command="$4"
	local note="$5"

	GATE_NAMES+=("$name")
	GATE_STATUSES+=("$status")
	GATE_DURATIONS+=("$duration")
	GATE_COMMANDS+=("$command")
	GATE_NOTES+=("$note")
	GATE_COUNT=$((GATE_COUNT + 1))
	TOTAL_DURATION=$((TOTAL_DURATION + duration))

	case "$status" in
	pass) PASS_COUNT=$((PASS_COUNT + 1)) ;;
	fail) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
	warn) WARN_COUNT=$((WARN_COUNT + 1)) ;;
	skip) SKIP_COUNT=$((SKIP_COUNT + 1)) ;;
	esac

	if [[ "$MAX_FAILURES" -gt 0 && "$FAIL_COUNT" -ge "$MAX_FAILURES" ]]; then
		log ERROR "Reached max failures threshold ($MAX_FAILURES)."
		exit 1
	fi
}

validate_args() {
	if [[ "$PROFILE" != "quick" && "$PROFILE" != "full" && "$PROFILE" != "ci" ]]; then
		log ERROR "Invalid profile '$PROFILE'. Expected quick, full, or ci."
		exit 1
	fi

	if ! [[ "$RETRIES" =~ ^[0-9]+$ ]] || [[ "$RETRIES" -lt 1 ]]; then
		log ERROR "Invalid retries '$RETRIES'. Use integer >= 1."
		exit 1
	fi

	if ! [[ "$TIMEOUT_SECONDS" =~ ^[0-9]+$ ]]; then
		log ERROR "Invalid timeout '$TIMEOUT_SECONDS'. Use integer >= 0."
		exit 1
	fi

	if ! [[ "$MAX_FAILURES" =~ ^[0-9]+$ ]]; then
		log ERROR "Invalid max-failures '$MAX_FAILURES'. Use integer >= 0."
		exit 1
	fi

	local requested_gate
	for requested_gate in "${ONLY_GATES[@]}" "${SKIP_GATES[@]}"; do
		if [[ -z "$requested_gate" ]]; then
			continue
		fi
		if [[ ! " ${SUPPORTED_GATES[*]} " =~ " $requested_gate " ]]; then
			log ERROR "Unknown gate id '$requested_gate'. Use --list-gates to inspect valid ids."
			exit 1
		fi
	done
}

parse_args() {
	while [[ $# -gt 0 ]]; do
		case "$1" in
		--profile)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --profile"
				exit 1
			fi
			PROFILE="$2"
			shift 2
			;;
		--install)
			INSTALL_DEPS=true
			shift
			;;
		--skip-e2e)
			SKIP_E2E=true
			shift
			;;
		--continue-on-error)
			CONTINUE_ON_ERROR=true
			shift
			;;
		--report-dir)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --report-dir"
				exit 1
			fi
			REPORT_DIR="$2"
			shift 2
			;;
		--json)
			EMIT_JSON=true
			shift
			;;
		--junit)
			EMIT_JUNIT=true
			shift
			;;
		--fail-on-warn)
			FAIL_ON_WARN=true
			shift
			;;
		--max-failures)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --max-failures"
				exit 1
			fi
			MAX_FAILURES="$2"
			shift 2
			;;
		--only)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --only"
				exit 1
			fi
			normalize_csv_list "$2" ONLY_GATES
			shift 2
			;;
		--skip)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --skip"
				exit 1
			fi
			normalize_csv_list "$2" SKIP_GATES
			shift 2
			;;
		--retries)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --retries"
				exit 1
			fi
			RETRIES="$2"
			shift 2
			;;
		--timeout)
			if [[ $# -lt 2 ]]; then
				log ERROR "Missing value for --timeout"
				exit 1
			fi
			TIMEOUT_SECONDS="$2"
			shift 2
			;;
		--verbose)
			VERBOSE=true
			shift
			;;
		--no-color)
			COLOR=false
			shift
			;;
		--list-gates)
			list_gates
			exit 0
			;;
		--dry-run)
			DRY_RUN=true
			shift
			;;
		--help)
			usage
			exit 0
			;;
		*)
			log ERROR "Unknown option: $1"
			usage
			exit 1
			;;
		esac
	done
}

prepare_reports() {
	mkdir -p "$REPORT_DIR"
	LOG_DIR="$REPORT_DIR/logs"
	mkdir -p "$LOG_DIR"
	REPORT_FILE="$REPORT_DIR/gate-report-$TIMESTAMP.md"
	JSON_REPORT_FILE="$REPORT_DIR/gate-report-$TIMESTAMP.json"
	JUNIT_REPORT_FILE="$REPORT_DIR/gate-report-$TIMESTAMP.junit.xml"
	RUN_LOG_FILE="$LOG_DIR/gate-run-$TIMESTAMP.log"

	cat >"$REPORT_FILE" <<REPORT
# Enhancement Gates Report

- Timestamp: $(date -Iseconds)
- Profile: $PROFILE
- Install dependencies: $INSTALL_DEPS
- Skip E2E: $SKIP_E2E
- Continue on error: $CONTINUE_ON_ERROR
- Dry-run: $DRY_RUN
- Retries: $RETRIES
- Timeout (seconds): $TIMEOUT_SECONDS
- Fail on warn: $FAIL_ON_WARN
- Max failures: $MAX_FAILURES
- Root directory: $ROOT_DIR
- Run log: ${RUN_LOG_FILE#$ROOT_DIR/}

## Environment Snapshot
- Shell: ${SHELL:-unknown}
- User: $(id -un)
- Host: $(hostname)
- Git HEAD: $(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")

## Gate Results
REPORT
}

gate_enabled() {
	local gate_id="$1"
	local item
	if [[ ${#ONLY_GATES[@]} -gt 0 ]]; then
		local found=false
		for item in "${ONLY_GATES[@]}"; do
			if [[ "$item" == "$gate_id" ]]; then
				found=true
				break
			fi
		done
		[[ "$found" == true ]] || return 1
	fi

	for item in "${SKIP_GATES[@]}"; do
		[[ "$item" == "$gate_id" ]] && return 1
	done
	return 0
}

ensure_prerequisites() {
	local tools=(bash npm)
	if [[ "$PROFILE" == "full" || "$PROFILE" == "ci" ]]; then
		tools+=(java)
	fi

	for t in "${tools[@]}"; do
		if ! command -v "$t" >/dev/null 2>&1; then
			log ERROR "Missing prerequisite tool: $t"
			exit 1
		fi
	done

	if [[ ! -d "$ROOT_DIR/frontend" || ! -d "$ROOT_DIR/backend" ]]; then
		log ERROR "Expected frontend and backend directories under repo root"
		exit 1
	fi

	if [[ "$TIMEOUT_SECONDS" -gt 0 ]] && ! command -v timeout >/dev/null 2>&1; then
		log WARN "timeout command not available; per-command timeout disabled"
	fi
}

resolve_maven_cmd() {
	if [[ -x "$ROOT_DIR/backend/mvnw" ]]; then
		echo "./mvnw"
	else
		echo "mvn"
	fi
}

run_shell_command() {
	local cmd="$1"
	if [[ "$TIMEOUT_SECONDS" -gt 0 ]] && command -v timeout >/dev/null 2>&1; then
		# timeout is optional because some environments don't provide GNU coreutils.
		timeout "$TIMEOUT_SECONDS" bash -lc "$cmd"
	else
		bash -lc "$cmd"
	fi
}

run_gate() {
	local label="$1"
	local cmd="$2"
	local note="${3:-}"
	local start end duration attempt

	log INFO "Gate: $label"
	append_report "- ⏳ $label"
	append_report "  - Command: \`$cmd\`"
	[[ -n "$note" ]] && append_report "  - Note: $note"

	if [[ "$DRY_RUN" == true ]]; then
		log INFO "[dry-run] $cmd"
		append_report "  - Result: dry-run (not executed)"
		record_gate "$label" "skip" 0 "$cmd" "dry-run"
		return 0
	fi

	start="$(date +%s)"
	for ((attempt = 1; attempt <= RETRIES; attempt++)); do
		if [[ "$VERBOSE" == true ]]; then
			log INFO "Executing attempt $attempt/$RETRIES"
		fi
		if run_shell_command "$cmd" >>"$RUN_LOG_FILE" 2>&1; then
			end="$(date +%s)"
			duration=$((end - start))
			append_report "  - Result: success (attempt $attempt, ${duration}s)"
			record_gate "$label" "pass" "$duration" "$cmd" "$note"
			return 0
		fi
		log WARN "Attempt $attempt/$RETRIES failed for gate '$label'"
	done

	end="$(date +%s)"
	duration=$((end - start))
	append_report "  - Result: failure (${duration}s)"
	record_gate "$label" "fail" "$duration" "$cmd" "$note"

	if [[ "$CONTINUE_ON_ERROR" == true ]]; then
		log WARN "Continuing after failure in gate '$label'"
		return 0
	fi

	log ERROR "Stopping due to gate failure: $label"
	exit 1
}

record_skipped_gate() {
	local gate_name="$1"
	local gate_cmd="$2"
	local reason="$3"
	record_gate "$gate_name" "skip" 0 "$gate_cmd" "$reason"
	append_report "- ℹ️ $gate_name"
	append_report "  - Result: skipped ($reason)"
}

run_docs_gate() {
	if ! gate_enabled "docs"; then
		record_skipped_gate "Documentation freshness gate" "file-existence-check" "selection filters"
		return
	fi

	local docs=(
		"plan.md"
		"notes.md"
		"guides/delivery-playbook.md"
		"guides/improvement-notes.md"
	)
	local missing=()

	for required in "${docs[@]}"; do
		if [[ ! -f "$ROOT_DIR/$required" ]]; then
			missing+=("$required")
		fi
	done

	if [[ ${#missing[@]} -gt 0 ]]; then
		record_gate "Documentation freshness gate" "fail" 0 "file-existence-check" "Missing: ${missing[*]}"
		append_report "- ❌ Documentation freshness gate"
		append_report "  - Missing: ${missing[*]}"
		if [[ "$CONTINUE_ON_ERROR" == true ]]; then
			return
		fi
		exit 1
	fi

	record_gate "Documentation freshness gate" "pass" 0 "file-existence-check" "All required docs present"
	append_report "- ✅ Documentation freshness gate"
	for required in "${docs[@]}"; do
		append_report "  - Present: $required"
	done
}

install_dependencies() {
	if [[ "$INSTALL_DEPS" != true ]]; then
		append_report "- ℹ️ Dependency installation skipped"
		return
	fi

	if [[ -f "$ROOT_DIR/frontend/package-lock.json" ]]; then
		run_gate "Install frontend dependencies" "cd '$ROOT_DIR/frontend' && npm ci" "Using lockfile for reproducible install"
	else
		run_gate "Install frontend dependencies" "cd '$ROOT_DIR/frontend' && npm install" "Lockfile not found"
	fi

	run_gate "Prepare backend dependencies" "cd '$ROOT_DIR/backend' && $(resolve_maven_cmd) -q -DskipTests dependency:go-offline" "Pre-fetch Maven dependencies"
}

run_quality_gates() {
	gate_enabled "frontend:format" && run_gate "Frontend format check" "cd '$ROOT_DIR/frontend' && npm run format:check" || record_skipped_gate "Frontend format check" "cd '$ROOT_DIR/frontend' && npm run format:check" "selection filters"
	gate_enabled "frontend:lint" && run_gate "Frontend lint" "cd '$ROOT_DIR/frontend' && npm run lint" || record_skipped_gate "Frontend lint" "cd '$ROOT_DIR/frontend' && npm run lint" "selection filters"
	gate_enabled "frontend:check" && run_gate "Frontend type checks" "cd '$ROOT_DIR/frontend' && npm run check" || record_skipped_gate "Frontend type checks" "cd '$ROOT_DIR/frontend' && npm run check" "selection filters"
	gate_enabled "frontend:unit" && run_gate "Frontend unit tests" "cd '$ROOT_DIR/frontend' && npm run test:unit" || record_skipped_gate "Frontend unit tests" "cd '$ROOT_DIR/frontend' && npm run test:unit" "selection filters"

	if [[ "$PROFILE" == "full" || "$PROFILE" == "ci" ]]; then
		gate_enabled "backend:test" && run_gate "Backend tests" "cd '$ROOT_DIR/backend' && $(resolve_maven_cmd) test" || record_skipped_gate "Backend tests" "cd '$ROOT_DIR/backend' && $(resolve_maven_cmd) test" "selection filters"
		if [[ "$SKIP_E2E" == true ]]; then
			record_skipped_gate "Frontend E2E smoke" "cd '$ROOT_DIR/frontend' && npm run test:e2e:smoke" "--skip-e2e"
		elif gate_enabled "frontend:e2e"; then
			run_gate "Frontend E2E smoke" "cd '$ROOT_DIR/frontend' && npm run test:e2e:smoke"
		else
			record_skipped_gate "Frontend E2E smoke" "cd '$ROOT_DIR/frontend' && npm run test:e2e:smoke" "selection filters"
		fi
	else
		record_skipped_gate "Backend tests" "cd '$ROOT_DIR/backend' && $(resolve_maven_cmd) test" "quick profile"
		record_skipped_gate "Frontend E2E smoke" "cd '$ROOT_DIR/frontend' && npm run test:e2e:smoke" "quick profile"
	fi
}

write_summary() {
	if [[ "$EXIT_TRAPPED" == true ]]; then
		return
	fi
	if [[ -z "$REPORT_FILE" ]]; then
		return
	fi
	EXIT_TRAPPED=true

	append_report ""
	append_report "## Summary"
	append_report "- Total gates tracked: $GATE_COUNT"
	append_report "- Passed: $PASS_COUNT"
	append_report "- Failed: $FAIL_COUNT"
	append_report "- Warnings: $WARN_COUNT"
	append_report "- Skipped: $SKIP_COUNT"
	append_report "- Aggregate measured duration (seconds): $TOTAL_DURATION"
	append_report ""
	append_report "## Gate Matrix"
	append_report "| Gate | Status | Duration (s) |"
	append_report "|---|---:|---:|"

	local i
	for ((i = 0; i < ${#GATE_NAMES[@]}; i++)); do
		append_report "| ${GATE_NAMES[$i]} | ${GATE_STATUSES[$i]} | ${GATE_DURATIONS[$i]} |"
	done

	if [[ "$EMIT_JSON" == true ]]; then
		export JSON_TIMESTAMP="$(date -Iseconds)"
		export JSON_GATE_NAMES="$(IFS=$'\x1f'; echo "${GATE_NAMES[*]}")"
		export JSON_GATE_STATUSES="$(IFS=$'\x1f'; echo "${GATE_STATUSES[*]}")"
		export JSON_GATE_DURATIONS="$(IFS=$'\x1f'; echo "${GATE_DURATIONS[*]}")"
		export JSON_GATE_COMMANDS="$(IFS=$'\x1f'; echo "${GATE_COMMANDS[*]}")"
		export JSON_GATE_NOTES="$(IFS=$'\x1f'; echo "${GATE_NOTES[*]}")"
		PROFILE="$PROFILE" DRY_RUN="$DRY_RUN" CONTINUE_ON_ERROR="$CONTINUE_ON_ERROR" \
		GATE_COUNT="$GATE_COUNT" PASS_COUNT="$PASS_COUNT" FAIL_COUNT="$FAIL_COUNT" \
		WARN_COUNT="$WARN_COUNT" SKIP_COUNT="$SKIP_COUNT" TOTAL_DURATION="$TOTAL_DURATION" \
		python - "$JSON_REPORT_FILE" <<'PY'
import json
import os
import sys

out_path = sys.argv[1]

raw = {
    "timestamp": os.environ["JSON_TIMESTAMP"],
    "profile": os.environ["PROFILE"],
    "dryRun": os.environ["DRY_RUN"] == "true",
    "continueOnError": os.environ["CONTINUE_ON_ERROR"] == "true",
    "totals": {
        "gates": int(os.environ["GATE_COUNT"]),
        "passed": int(os.environ["PASS_COUNT"]),
        "failed": int(os.environ["FAIL_COUNT"]),
        "warnings": int(os.environ["WARN_COUNT"]),
        "skipped": int(os.environ["SKIP_COUNT"]),
        "durationSeconds": int(os.environ["TOTAL_DURATION"]),
    },
    "gates": [],
}

for idx, name in enumerate(os.environ.get("JSON_GATE_NAMES", "").split("\x1f")):
    if name == "":
        continue
    raw["gates"].append({
        "name": name,
        "status": os.environ["JSON_GATE_STATUSES"].split("\x1f")[idx],
        "durationSeconds": int(os.environ["JSON_GATE_DURATIONS"].split("\x1f")[idx]),
        "command": os.environ["JSON_GATE_COMMANDS"].split("\x1f")[idx],
        "note": os.environ["JSON_GATE_NOTES"].split("\x1f")[idx],
    })

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(raw, f, indent=2)
PY
		append_report ""
		append_report "- JSON report: ${JSON_REPORT_FILE#$ROOT_DIR/}"
	fi

	if [[ "$EMIT_JUNIT" == true ]]; then
		{
			echo '<?xml version="1.0" encoding="UTF-8"?>'
			echo "<testsuite name=\"enhancement-gates\" tests=\"$GATE_COUNT\" failures=\"$FAIL_COUNT\" skipped=\"$SKIP_COUNT\">"
			for ((i = 0; i < ${#GATE_NAMES[@]}; i++)); do
				echo "  <testcase name=\"${GATE_NAMES[$i]}\" time=\"${GATE_DURATIONS[$i]}\">"
				if [[ "${GATE_STATUSES[$i]}" == "fail" ]]; then
					echo "    <failure message=\"gate failed\">${GATE_COMMANDS[$i]}</failure>"
				elif [[ "${GATE_STATUSES[$i]}" == "skip" ]]; then
					echo "    <skipped message=\"${GATE_NOTES[$i]}\" />"
				fi
				echo '  </testcase>'
			done
			echo '</testsuite>'
		} >"$JUNIT_REPORT_FILE"
		append_report "- JUnit report: ${JUNIT_REPORT_FILE#$ROOT_DIR/}"
	fi
}

handle_exit() {
	local code="$?"
	if [[ -n "$REPORT_FILE" ]]; then
		write_summary
	fi
	exit "$code"
}

main() {
	trap handle_exit EXIT
	parse_args "$@"
	validate_args
	prepare_reports
	ensure_prerequisites

	log INFO "Starting enhancement gates (profile=$PROFILE)"
	install_dependencies
	run_docs_gate
	run_quality_gates

	log INFO "Report saved to $REPORT_FILE"
	if [[ "$EMIT_JSON" == true ]]; then
		log INFO "JSON report saved to $JSON_REPORT_FILE"
	fi
	if [[ "$EMIT_JUNIT" == true ]]; then
		log INFO "JUnit report saved to $JUNIT_REPORT_FILE"
	fi

	if [[ "$FAIL_COUNT" -gt 0 ]]; then
		log ERROR "Completed with gate failures ($FAIL_COUNT)"
		exit 1
	fi

	if [[ "$FAIL_ON_WARN" == true && "$WARN_COUNT" -gt 0 ]]; then
		log ERROR "Warnings present with --fail-on-warn enabled"
		exit 1
	fi

	log INFO "Completed successfully"
}

main "$@"
