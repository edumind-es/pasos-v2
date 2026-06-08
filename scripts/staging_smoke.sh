#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${STAGING_BASE_URL:-}"

if [[ -z "$BASE_URL" ]]; then
  echo "Define STAGING_BASE_URL, por ejemplo: https://staging.pasos.edumind.es"
  exit 1
fi

API_BASE="${STAGING_API_BASE_URL:-${BASE_URL%/}/api/v1}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "[staging] Health check ${API_BASE}/health"
HEALTH_JSON="$(curl -fsS "${API_BASE}/health")"
python3 - <<'PY' "$HEALTH_JSON"
import json, sys
payload = json.loads(sys.argv[1])
assert payload["status"] == "ok", payload
print(f"[staging] health ok: {payload['app']} {payload['version']}")
PY

echo "[staging] Frontend reachability ${BASE_URL%/}/login"
curl -fsSI "${BASE_URL%/}/login" >/dev/null
echo "[staging] login page reachable"

if [[ -n "${STAGING_LOGIN_EMAIL:-}" && -n "${STAGING_LOGIN_PASSWORD:-}" ]]; then
  echo "[staging] API login"
  LOGIN_JSON="$(curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
    -X POST "${API_BASE}/auth/login" \
    -d "{\"email\":\"${STAGING_LOGIN_EMAIL}\",\"password\":\"${STAGING_LOGIN_PASSWORD}\"}")"
  ACCESS_TOKEN="$(python3 - <<'PY' "$LOGIN_JSON"
import json, sys
payload = json.loads(sys.argv[1])
print(payload["access_token"])
PY
)"
  curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" "${API_BASE}/auth/me" >/dev/null
  curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" "${API_BASE}/boards" >/dev/null
  echo "[staging] authenticated smoke ok"
fi

if [[ -n "${STAGING_SHARE_CODE:-}" ]]; then
  echo "[staging] share resolve ${STAGING_SHARE_CODE}"
  curl -fsS "${API_BASE}/share/${STAGING_SHARE_CODE}" >/dev/null
  echo "[staging] share resolve ok"
fi

echo "[staging] smoke OK"
