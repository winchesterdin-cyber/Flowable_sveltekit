# Team Notes (Post-Implementation Review)

## What changed in this pass
- Expanded `scripts/enhancement-gates.sh` with gate targeting, JUnit output, failure-budget controls, and warning-escalation controls.
- Added robust CLI parsing for new options and strict validation for unknown gate selectors.
- Added trap-safe summary finalization to preserve run evidence when failures happen mid-flight.
- Added `scripts/test-enhancement-gates.sh` to continuously validate gate-runner contract behavior.

## Updated operator workflow
1. **List available gate IDs**
   - `scripts/enhancement-gates.sh --list-gates`
2. **Run only targeted checks**
   - `scripts/enhancement-gates.sh --profile quick --only docs,frontend:lint`
3. **Skip selected checks**
   - `scripts/enhancement-gates.sh --profile full --skip frontend:e2e`
4. **Emit CI-ingestible artifacts**
   - `scripts/enhancement-gates.sh --profile ci --json --junit`
5. **Fail fast after N failures**
   - `scripts/enhancement-gates.sh --profile full --max-failures 2`
6. **Escalate warnings to hard failures**
   - `scripts/enhancement-gates.sh --profile full --fail-on-warn`

## Logging and diagnostics expectations
- Attach markdown reports from `.reports/` for every delivery.
- Include `.reports/logs/gate-run-*.log` excerpts for failures.
- Prefer JSON and JUnit artifacts for CI dashboards and test report UIs.

## Regression prevention
- Run `scripts/test-enhancement-gates.sh` whenever gate-runner behavior is changed.
- Keep selector IDs synchronized with parser validation and `--list-gates` output.
- Update docs in the same change set as any CLI contract change.

## What changed in this pass (v4 gate hardening)
- Added three new gate IDs: `frontend:build`, `backend:integration`, and `backend:package` for broader release readiness checks.
- Added operator controls: `--report-prefix`, `--keep-reports`, `--require-clean-git`, `--no-log-file`, and `--print-summary`.
- Strengthened docs gate validation by failing on empty required documentation files.
- Added artifact retention cleanup to keep report directories bounded.
- Expanded self-tests to cover new CLI and behavior paths (gate listing, no-log metadata, dirty-tree protection).

## Operational examples (new)
1. **Run only build + package checks in CI dry-run mode**
   - `scripts/enhancement-gates.sh --profile ci --dry-run --only frontend:build,backend:package`
2. **Use custom report names and keep last 5 runs**
   - `scripts/enhancement-gates.sh --profile full --report-prefix release-gates --keep-reports 5`
3. **Protect against dirty working trees**
   - `scripts/enhancement-gates.sh --profile full --require-clean-git`
4. **Disable persistent logs while keeping markdown report**
   - `scripts/enhancement-gates.sh --profile quick --no-log-file`
