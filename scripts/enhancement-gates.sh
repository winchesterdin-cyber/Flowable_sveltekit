#!/usr/bin/env bash
set -euo pipefail

# Enhanced quality gate runner.
# Adds profile support, optional dependency bootstrapping, structured logging,
# timing metrics, and markdown report generation for reproducible validation.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/.reports"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_FILE="$REPORT_DIR/gate-report-$TIMESTAMP.md"
PROFILE="full"
INSTALL_DEPS=false
DRY_RUN=false
SKIP_E2E=false

usage() {
	cat <<USAGE
Usage: scripts/enhancement-gates.sh [options]

Options:
  --profile <quick|full>   Gate profile (default: full)
  --install                Install required dependencies before running checks
  --skip-e2e               Skip E2E smoke tests even in full profile
  --dry-run                Print commands without executing
  --help                   Show this message
USAGE
}

log() {
	local level="$1"
	shift
	local msg="$*"
	printf '[enhancement-gates][%s][%s] %s\n' "$(date +%H:%M:%S)" "$level" "$msg"
}

append_report() {
	printf '%s\n' "$*" >>"$REPORT_FILE"
}

run_cmd() {
	local label="$1"
	local cmd="$2"

	log INFO "$label"
	append_report "- ⏳ $label"
	append_report "  - Command: \`$cmd\`"

	if [[ "$DRY_RUN" == true ]]; then
		log INFO "[dry-run] $cmd"
		append_report "  - Result: dry-run (not executed)"
		return 0
	fi

	# shellcheck disable=SC2086
	eval "$cmd"
	append_report "  - Result: success"
}

validate_args() {
	if [[ "$PROFILE" != "quick" && "$PROFILE" != "full" ]]; then
		log ERROR "Invalid profile '$PROFILE'. Expected quick or full."
		exit 1
	fi
}

parse_args() {
	while [[ $# -gt 0 ]]; do
		case "$1" in
		--profile)
			PROFILE="${2:-}"
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

prepare_report() {
	mkdir -p "$REPORT_DIR"
	cat >"$REPORT_FILE" <<REPORT
# Enhancement Gates Report

- Timestamp: $(date -Iseconds)
- Profile: $PROFILE
- Install dependencies: $INSTALL_DEPS
- Skip E2E: $SKIP_E2E
- Dry-run: $DRY_RUN

## Gate Results
REPORT
}

resolve_maven_cmd() {
	if [[ -x "$ROOT_DIR/backend/mvnw" ]]; then
		echo "./mvnw"
	else
		echo "mvn"
	fi
}

install_dependencies() {
	if [[ "$INSTALL_DEPS" != true ]]; then
		log INFO "Dependency installation skipped"
		append_report "- ℹ️ Dependency installation skipped"
		return
	fi

	run_cmd "Install frontend dependencies" "cd '$ROOT_DIR/frontend' && npm install"
	run_cmd "Prepare backend dependencies" "cd '$ROOT_DIR/backend' && $(resolve_maven_cmd) -q -DskipTests dependency:go-offline"
}

run_docs_gate() {
	log INFO "Running documentation freshness gate"
	append_report "- ✅ Documentation gate"
	for required in "plan.md" "notes.md" "guides/delivery-playbook.md"; do
		if [[ ! -f "$ROOT_DIR/$required" ]]; then
			log ERROR "Missing required documentation file: $required"
			append_report "  - Missing: $required"
			exit 1
		fi
		append_report "  - Present: $required"
	done
}

run_quality_gates() {
	local start_seconds
	start_seconds="$(date +%s)"

	run_cmd "Frontend format check" "cd '$ROOT_DIR/frontend' && npm run format:check"
	run_cmd "Frontend lint" "cd '$ROOT_DIR/frontend' && npm run lint"
	run_cmd "Frontend type checks" "cd '$ROOT_DIR/frontend' && npm run check"
	run_cmd "Frontend unit tests" "cd '$ROOT_DIR/frontend' && npm run test:unit"

	if [[ "$PROFILE" == "full" ]]; then
		run_cmd "Backend tests" "cd '$ROOT_DIR/backend' && $(resolve_maven_cmd) test"
		if [[ "$SKIP_E2E" == true ]]; then
			log WARN "Skipping E2E by request"
			append_report "- ⚠️ E2E skipped by --skip-e2e"
		else
			run_cmd "Frontend E2E smoke" "cd '$ROOT_DIR/frontend' && npm run test:e2e:smoke"
		fi
	else
		log INFO "Quick profile selected: backend and E2E gates skipped"
		append_report "- ℹ️ Quick profile skips backend and E2E gates"
	fi

	local end_seconds
	end_seconds="$(date +%s)"
	local total
	total=$((end_seconds - start_seconds))
	append_report "\n## Summary"
	append_report "- Total gate duration (seconds): $total"
	log INFO "Gate execution completed in ${total}s"
}

main() {
	parse_args "$@"
	validate_args
	prepare_report

	log INFO "Starting enhancement gates (profile=$PROFILE)"
	install_dependencies
	run_docs_gate
	run_quality_gates
	log INFO "Report saved to $REPORT_FILE"
}

main "$@"
