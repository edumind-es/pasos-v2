#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:9150}"
UNIQUE_SUFFIX="$(python3 - <<'PY'
import uuid
print(uuid.uuid4().hex[:12])
PY
)"
EMAIL="smoke.${UNIQUE_SUFFIX}@example.com"
PASSWORD="SeguraSmoke123"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

wait_for_health() {
  local attempts=0
  until curl -fsS "${BASE_URL}/api/v1/health" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge 20 ]; then
      echo "API not ready after waiting for healthcheck" >&2
      return 1
    fi
    sleep 1
  done
}

echo "1. Health"
wait_for_health
curl -fsS "${BASE_URL}/api/v1/health" | python3 -c "import json,sys; data=json.load(sys.stdin); assert data['status']=='ok'; print(data['status'])"

echo "2. Register"
REGISTER_PAYLOAD="$(printf '{"email":"%s","display_name":"Smoke User","password":"%s"}' "$EMAIL" "$PASSWORD")"
REGISTER_JSON="$(curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' -d "$REGISTER_PAYLOAD" "${BASE_URL}/api/v1/auth/register")"
ACCESS_TOKEN="$(printf '%s' "$REGISTER_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")"

echo "3. Create board"
BOARD_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" -H 'Content-Type: application/json' \
  -d '{"title":"Smoke board","snapshot":{"columns":[{"id":"todo","title":"Por hacer","order":0}],"tasks":[]}}' \
  "${BASE_URL}/api/v1/boards")"
BOARD_ID="$(printf '%s' "$BOARD_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"

echo "4. Share board"
SHARE_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" -H 'Content-Type: application/json' \
  -d '{"permission":"viewer","ttl_hours":24,"allow_anonymous":true}' \
  "${BASE_URL}/api/v1/boards/${BOARD_ID}/share")"
SHARE_CODE="$(printf '%s' "$SHARE_JSON" | python3 -c "import json,sys; print(json.load(sys.stdin)['code'])")"

echo "5. Resolve share"
curl -fsS "${BASE_URL}/api/v1/share/${SHARE_CODE}" | python3 -c "import json,sys; data=json.load(sys.stdin); assert data['code']; print(data['board']['title'])"

echo "Smoke API OK"
