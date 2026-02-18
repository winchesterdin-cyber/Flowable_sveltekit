# Delivery Playbook

This playbook defines the operational standard for enhancement delivery and validation.

## 1) Canonical planning and execution artifacts
- Keep active execution intent in `plan.md`.
- Capture outcomes in generated reports under `.reports/`.

## 2) Primary validation entrypoint
Use `scripts/enhancement-gates.sh` as the canonical command for local and CI checks.

## 3) Gate profiles
- **Quick:** frontend-only validation for iteration speed.
  - `scripts/enhancement-gates.sh --profile quick`
- **Full:** full validation (frontend + backend + E2E unless skipped).
  - `scripts/enhancement-gates.sh --profile full`
- **CI:** broad coverage with report-first ergonomics for pipelines.
  - `scripts/enhancement-gates.sh --profile ci --json --junit`

## 4) Gate targeting
- Print valid gate IDs:
  - `scripts/enhancement-gates.sh --list-gates`
- Run a targeted subset:
  - `scripts/enhancement-gates.sh --profile quick --only docs,frontend:lint`
- Exclude expensive gates:
  - `scripts/enhancement-gates.sh --profile full --skip frontend:e2e`

## 5) Policy controls
- Continue and inventory all failures:
  - `scripts/enhancement-gates.sh --profile full --continue-on-error`
- Stop after failure budget is reached:
  - `scripts/enhancement-gates.sh --profile full --max-failures 2`
- Escalate warnings to failures:
  - `scripts/enhancement-gates.sh --profile full --fail-on-warn`
- Add retry behavior for transient checks:
  - `scripts/enhancement-gates.sh --profile full --retries 2`
- Prevent hanging commands:
  - `scripts/enhancement-gates.sh --profile full --timeout 1200`

## 6) Dependency and prerequisite hygiene
- Prefer `npm ci` with lockfiles for deterministic installs.
- Pre-fetch backend dependencies using Maven offline goal.
- Validate required tools (`bash`, `npm`, and `java` for full/ci) before execution.

## 7) Reporting standards
- Markdown report is mandatory and generated every run.
- JSON report is optional and recommended in CI.
- JUnit report is optional and recommended for test-report UIs.
- Persist run logs from `.reports/logs/` for troubleshooting.

## 8) Documentation freshness gate
The script verifies required docs exist before major gates:
- `plan.md`
- `notes.md`
- `guides/delivery-playbook.md`
- `guides/improvement-notes.md`

## 9) Definition of done
A change is complete when:
- Required gate profile passes (or all failures are explicitly triaged).
- Reports and logs are attached to review context.
- Planning + notes + playbook docs are updated together.
- No unresolved runtime blockers remain.
