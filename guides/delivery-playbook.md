# Delivery Playbook

This playbook turns the enhancement plan into repeatable team behaviors and concrete artifacts.

## 1) Canonical enhancement planning
- Keep the active enhancement execution plan in `plan.md`.
- Track implementation status and validation evidence in the same file.

## 2) Baseline health audit
- Use `scripts/enhancement-gates.sh` as the primary validation command.
- Store the generated report (`.reports/gate-report-*.md`) with your review artifacts.

## 3) Strict quality gate sequence
1. Frontend formatting checks.
2. Frontend lint.
3. Frontend type checks.
4. Frontend unit tests.
5. Backend tests (full profile).
6. Frontend E2E smoke tests (full profile unless explicitly skipped).

## 4) Profile-based execution model
- **Quick profile:** `scripts/enhancement-gates.sh --profile quick`
- **Full profile:** `scripts/enhancement-gates.sh --profile full`
- **With dependency bootstrap:** add `--install`
- **When browser constraints exist:** add `--skip-e2e`

## 5) Dependency hygiene and reproducibility
- Run full profile with `--install` when onboarding a new environment.
- Keep Node/Maven dependency install output in CI logs for traceability.

## 6) Logging quality
- Include process/task/user context identifiers in application logs.
- Use timestamped gate logs for command-level diagnostics.

## 7) Comment strategy
- Add intent comments around complex branching or compensation logic.
- Avoid comments that merely repeat code.

## 8) Release-readiness checklist
- Automated checks pass for required profile.
- Generated gate report is attached/referenced.
- No unresolved runtime warnings/errors.
- Docs updated for user-facing changes.

## 9) Test gap workflow
- Track uncovered scenarios directly in `notes.md` until addressed.

## 10) Documentation cadence
- Update `plan.md`, `notes.md`, and this playbook in the same PR when process changes.
