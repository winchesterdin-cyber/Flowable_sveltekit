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
