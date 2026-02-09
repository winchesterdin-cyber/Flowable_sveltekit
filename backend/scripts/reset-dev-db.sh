#!/usr/bin/env bash
set -euo pipefail

# Reset the local H2 dev database and optionally seed data if the backend is running.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIR="${ROOT_DIR}/data"
DB_PREFIX="${DB_DIR}/dev-db"

echo "[reset-dev-db] Preparing local H2 database reset..."
mkdir -p "${DB_DIR}"

echo "[reset-dev-db] Removing existing database files..."
rm -f "${DB_PREFIX}"*

echo "[reset-dev-db] Database files removed. Start the backend with SPRING_PROFILES_ACTIVE=h2."
echo "[reset-dev-db] Attempting to seed data via /api/database/seed if server is reachable."

if command -v curl >/dev/null 2>&1; then
  SEED_STATUS="$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8080/api/database/seed || true)"
  if [[ "${SEED_STATUS}" == "200" ]]; then
    echo "[reset-dev-db] Seed request succeeded."
  else
    echo "[reset-dev-db] Seed request skipped or failed (status: ${SEED_STATUS}). Ensure the backend is running."
  fi
else
  echo "[reset-dev-db] curl not available. Start the backend and POST /api/database/seed manually."
fi
