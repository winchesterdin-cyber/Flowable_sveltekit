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
