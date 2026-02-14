# Delivery Playbook

This playbook turns the 20-point improvement plan into repeatable team behaviors and concrete artifacts.

## 1) Single planning source of truth
- Use only `PLAN.md` for roadmap tracking.
- Archive superseded planning artifacts instead of creating parallel plan files.

## 2) Baseline health audit
- Run `scripts/quality-gates.sh` before opening a PR.
- Save output snippets when failures occur to simplify triage.

## 3) Strict quality gate sequence
1. Frontend formatting checks.
2. Frontend lint.
3. Frontend type checks.
4. Frontend unit tests.
5. Backend tests.
6. Frontend E2E smoke tests.

## 4) Standard task tracking format
- Every plan item must include: objective, risk, owner, status, notes.

## 5) Ownership expectations
- Backend owner: services/controllers/data integrity.
- Frontend owner: routes/components/state restoration.
- Shared owner: release checks/contracts/docs.

## 6) Small vertical slices
- Keep each PR focused on one behavior or one operational capability.

## 7) Deterministic local test data
- Prefer local disposable DB and reproducible seed sets.
- Avoid time-dependent assertions without freezing time.

## 8) Logging quality
- Include process/task/user context identifiers in logs.
- Avoid ambiguous messages; always log action + outcome.

## 9) Comment strategy
- Add intent comments around complex branching or compensation logic.
- Avoid comments that merely repeat code.

## 10) Release-readiness checklist
- Automated checks pass.
- No unresolved runtime warnings/errors.
- Docs updated for user-facing changes.

## 11) Test gap workflow
- Track uncovered scenarios directly in `notes.md` until addressed.

## 12) Frontend observability
- During E2E, watch browser console and failed network requests.

## 13) Backend triage workflow
- Classify failures first: controller/service/engine/database.

## 14) Documentation cadence
- Update docs in same PR for behavior changes.

## 15) Onboarding efficiency
- Keep this file and `notes.md` current as first-stop onboarding docs.

## 16) Dependency hygiene
- Schedule regular update windows and rerun full gates.

## 17) API contract consistency
- Validate DTO/response shapes with tests when API payloads evolve.

## 18) Performance regression awareness
- Monitor expensive dashboard/process list calls during load growth.

## 19) Security hygiene
- Never commit secrets.
- Preserve auth checks and audit events for privileged actions.

## 20) Post-implementation review
- Add short retrospectives to `notes.md`: what changed, what broke, what to improve next.
