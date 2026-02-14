#!/usr/bin/env bash
set -euo pipefail

# Quality gates for local and CI usage.
# The sequence is intentionally strict to fail fast and keep diagnostics focused.

echo "[quality-gates] Step 1/6: frontend format check"
(cd frontend && npm run format:check)

echo "[quality-gates] Step 2/6: frontend lint"
(cd frontend && npm run lint)

echo "[quality-gates] Step 3/6: frontend type/svelte check"
(cd frontend && npm run check)

echo "[quality-gates] Step 4/6: frontend unit tests"
(cd frontend && npm run test:unit)

echo "[quality-gates] Step 5/6: backend unit/integration tests"
(cd backend && mvn test)

echo "[quality-gates] Step 6/6: frontend e2e smoke"
(cd frontend && npm run test:e2e:smoke)

echo "[quality-gates] all checks passed"
