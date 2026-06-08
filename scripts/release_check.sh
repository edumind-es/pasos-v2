#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

echo "[release] Lint"
npm run lint

echo "[release] Frontend tests"
npm run test:run

echo "[release] Frontend E2E"
npm run test:e2e

echo "[release] Build"
npm run build

echo "[release] Backend tests"
python3 -m pytest -q "$ROOT_DIR/backend/tests"

echo "[release] Backend import validation"
python3 -m compileall "$ROOT_DIR/backend/app"

echo "[release] OK"
