#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${PILOT_BASE_URL:-}}"

if [ -z "${BASE_URL}" ]; then
  echo "Usage: PILOT_ALLOW_WRITE=1 $0 <base-url>" >&2
  exit 1
fi

if [ "${PILOT_ALLOW_WRITE:-0}" != "1" ]; then
  echo "This script creates pilot data on the target environment." >&2
  echo "Set PILOT_ALLOW_WRITE=1 to continue." >&2
  exit 1
fi

UNIQUE_SUFFIX="$(python3 - <<'PY'
import uuid
print(uuid.uuid4().hex[:12])
PY
)"
EMAIL="pilot.${UNIQUE_SUFFIX}@example.com"
PASSWORD="SeguraPilot123"
COOKIE_JAR="$(mktemp)"
CSV_FILE="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$CSV_FILE"' EXIT

json_field() {
  local field="$1"
  python3 -c "import json,sys; print(json.load(sys.stdin)${field})"
}

echo "1. Health"
curl -fsS "${BASE_URL}/api/v1/health" | python3 -c "import json,sys; data=json.load(sys.stdin); assert data['status']=='ok'; print(data['status'])"

echo "2. Register"
REGISTER_JSON="$(curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"display_name\":\"Pilot Center Admin\",\"password\":\"${PASSWORD}\"}" \
  "${BASE_URL}/api/v1/auth/register")"
ACCESS_TOKEN="$(printf '%s' "$REGISTER_JSON" | json_field "['access_token']")"

echo "3. Create organization"
ORG_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" -H 'Content-Type: application/json' \
  -d '{"name":"Centro Piloto Smoke","plan_type":"school"}' \
  "${BASE_URL}/api/v1/organizations")"
ORG_ID="$(printf '%s' "$ORG_JSON" | json_field "['id']")"

echo "4. Create team"
TEAM_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" -H 'Content-Type: application/json' \
  -d '{"name":"Equipo Motor Smoke","team_type":"project","visibility":"organization"}' \
  "${BASE_URL}/api/v1/organizations/${ORG_ID}/teams")"
TEAM_ID="$(printf '%s' "$TEAM_JSON" | json_field "['id']")"

echo "5. Create board"
YESTERDAY="$(date -u -d 'yesterday' +%FT%TZ 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)"
TOMORROW="$(date -u -d 'tomorrow' +%FT%TZ 2>/dev/null || python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)"
BOARD_PAYLOAD="$(cat <<JSON
{
  "title": "Piloto institucional smoke",
  "organization_id": "${ORG_ID}",
  "team_id": "${TEAM_ID}",
  "context_type": "team",
  "board_type": "organization_project",
  "snapshot": {
    "columns": [
      {"id": "todo", "title": "Por hacer", "order": 0},
      {"id": "review", "title": "Listo para revisar", "order": 1},
      {"id": "done", "title": "Hecho", "order": 2}
    ],
    "tasks": [
      {
        "id": "task-1",
        "columnId": "todo",
        "title": "Documento marco",
        "taskType": "document",
        "labels": ["piloto"],
        "startDate": "${YESTERDAY}",
        "dueDate": "${YESTERDAY}",
        "ownerLabel": "Coordinacion",
        "effortPoints": 3,
        "dependencyTaskIds": [],
        "pictograms": [],
        "attachments": [],
        "createdAt": 1
      },
      {
        "id": "task-2",
        "columnId": "review",
        "title": "Seguimiento de aula",
        "taskType": "learning_step",
        "labels": ["aula"],
        "startDate": "${YESTERDAY}",
        "dueDate": "${TOMORROW}",
        "ownerLabel": "Tutorias",
        "effortPoints": 5,
        "dependencyTaskIds": ["task-1"],
        "pictograms": [],
        "attachments": [],
        "createdAt": 2
      },
      {
        "id": "task-3",
        "columnId": "todo",
        "title": "Hito de centro",
        "taskType": "milestone",
        "labels": ["hito"],
        "dueDate": "${YESTERDAY}",
        "ownerLabel": "Direccion",
        "effortPoints": 2,
        "dependencyTaskIds": ["task-2"],
        "pictograms": [],
        "attachments": [],
        "createdAt": 3
      }
    ]
  }
}
JSON
)"
BOARD_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" -H 'Content-Type: application/json' \
  -d "${BOARD_PAYLOAD}" "${BASE_URL}/api/v1/boards")"
BOARD_ID="$(printf '%s' "$BOARD_JSON" | json_field "['id']")"

echo "6. Create document"
curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" -H 'Content-Type: application/json' \
  -d '{"title":"Acta de piloto smoke","kind":"note","status":"in_review","content":"Pendiente de validacion.","linked_task_ids":["task-1"],"tags":["piloto","smoke"]}' \
  "${BASE_URL}/api/v1/boards/${BOARD_ID}/documents" >/dev/null

echo "7. Executive dashboard"
EXEC_JSON="$(curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${BASE_URL}/api/v1/executive/dashboard?organization_id=${ORG_ID}&period_days=30")"
printf '%s' "$EXEC_JSON" | python3 -c "import json,sys; data=json.load(sys.stdin); assert data['summary']['total_boards'] >= 1; print(data['summary'])"

echo "8. Executive dashboard CSV"
curl -fsS -b "$COOKIE_JAR" -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "${BASE_URL}/api/v1/executive/dashboard.csv?organization_id=${ORG_ID}&period_days=30" > "$CSV_FILE"
grep -q "project_progress" "$CSV_FILE"

echo "Pilot center smoke OK"
