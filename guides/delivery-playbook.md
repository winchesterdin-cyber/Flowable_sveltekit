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
- **CI:** same broad coverage with report-first ergonomics for pipelines.
  - `scripts/enhancement-gates.sh --profile ci --json`

## 4) Recommended flag combinations
- Install dependencies first:
  - `scripts/enhancement-gates.sh --profile full --install`
- Continue and inventory all failures:
  - `scripts/enhancement-gates.sh --profile full --continue-on-error`
- Add retry behavior for transient checks:
  - `scripts/enhancement-gates.sh --profile full --retries 2`
- Prevent hanging commands:
  - `scripts/enhancement-gates.sh --profile full --timeout 1200`
- Skip browser automation when blocked:
  - `scripts/enhancement-gates.sh --profile full --skip-e2e`

## 5) Dependency and prerequisite hygiene
- Prefer `npm ci` with lockfiles for deterministic installs.
- Pre-fetch backend dependencies using Maven offline goal.
- Validate required tools (`bash`, `npm`, and `java` for full/ci) before execution.

## 6) Reporting standards
- Markdown report is mandatory and generated every run.
- JSON report is optional and recommended in CI.
- Persist run logs from `.reports/logs/` for troubleshooting.

## 7) Documentation freshness gate
The script verifies required docs exist before major gates:
- `plan.md`
- `notes.md`
- `guides/delivery-playbook.md`
- `guides/improvement-notes.md`

## 8) Comment strategy
- Add intent comments around non-obvious control flow and operational safeguards.
- Keep comments synchronized with behavior changes.

## 9) Definition of done
A change is complete when:
- Required gate profile passes (or all failures are explicitly triaged).
- Reports and logs are attached to review context.
- Planning + notes + playbook docs are updated together.
- No unresolved runtime blockers remain.
