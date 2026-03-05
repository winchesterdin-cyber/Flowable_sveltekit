# Improvement Notes

## Enhancement Gates v3 Highlights

### Targeted execution controls
- Added `--only` and `--skip` to select gate subsets.
- Added `--list-gates` to print supported gate IDs.
- Added selection-aware skip tracking in reports.

### CI reporting upgrades
- Added optional JUnit XML output via `--junit`.
- Retained JSON output and markdown reports for dual consumption.
- Added Git HEAD metadata to reports for traceability.

### Policy and failure handling
- Added `--max-failures` to stop after configurable failed-gate threshold.
- Added `--fail-on-warn` to treat warning outcomes as hard failures.
- Added trap-safe summary writing on exit paths.

### DX and maintainability
- Added optional colorized log levels with `--no-color` override.
- Added helper functions for selector parsing and skip recording.
- Added self-test harness (`scripts/test-enhancement-gates.sh`) for contract checks.

## Recommended next optimizations
- Add historic trend aggregation from JSON outputs.
- Add JUnit attachment publishing in CI workflow.
- Add selective gate aliases (e.g., `frontend:all`) for reduced command verbosity.

## Enhancement Gates v4 Highlights

### Coverage expansion
- Added `frontend:build` to validate production compile pipeline.
- Added `backend:integration` for explicit integration test execution.
- Added `backend:package` to validate packaging lifecycle.

### Operability improvements
- Added `--report-prefix` for deterministic artifact naming.
- Added `--keep-reports` for built-in report retention.
- Added `--no-log-file` for environments that should avoid persistent logs.
- Added `--print-summary` for concise completion telemetry.
- Added `--require-clean-git` for release-discipline enforcement.

### Validation hardening
- Docs gate now validates non-empty required documents.
- Parser validation extended for `--keep-reports` numeric constraints.
- Self-tests extended for new argument and behavior contracts.
