#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DOMAIN="${DOMAIN:-pasos.edumind.es}"
API_PORT="${API_PORT:-9150}"
LOCAL_HEALTH_URL="${LOCAL_HEALTH_URL:-http://127.0.0.1:${API_PORT}/api/v1/health}"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-https://${DOMAIN}/health}"
PUBLIC_ROOT_URL="${PUBLIC_ROOT_URL:-https://${DOMAIN}/}"
STAGE_DIR="${STAGE_DIR:-${REPO_ROOT}/.build/latest}"
MODE="production"
RUN_SMOKE=0

usage() {
  cat <<'EOF'
Usage:
  scripts/verify_production.sh
  scripts/verify_production.sh --local
  scripts/verify_production.sh --smoke-auth
EOF
}

log() {
  printf '[verify] %s\n' "$*"
}

die() {
  printf '[verify] ERROR: %s\n' "$*" >&2
  exit 1
}

json_health_ok() {
  python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["status"]=="ok"; print(data["status"])'
}

while [ $# -gt 0 ]; do
  case "$1" in
    --local)
      MODE="local"
      ;;
    --smoke-auth)
      RUN_SMOKE=1
      ;;
    --stage-dir)
      shift
      [ $# -gt 0 ] || die "--stage-dir requires a value"
      STAGE_DIR="$1"
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
  shift
done

if [ "${MODE}" = "local" ]; then
  log "Checking staged release contents at ${STAGE_DIR}"
  [ -d "${STAGE_DIR}" ] || die "stage dir not found"
  [ -f "${STAGE_DIR}/RELEASE_METADATA.json" ] || die "missing RELEASE_METADATA.json"
  [ -f "${STAGE_DIR}/frontend/dist/index.html" ] || die "missing frontend/dist/index.html"
  [ -f "${STAGE_DIR}/backend/wsgi.py" ] || die "missing backend/wsgi.py"
  [ -f "${STAGE_DIR}/deploy/systemd/pasos-api.service" ] || die "missing systemd unit"
  [ -f "${STAGE_DIR}/deploy/nginx/pasos.edumind.es.conf" ] || die "missing nginx vhost"
  log "Local stage verification OK"
  exit 0
fi

log "Checking API socket on 127.0.0.1:${API_PORT}"
ss -ltn | grep -Eq "127\\.0\\.0\\.1:${API_PORT}[[:space:]]"

log "Checking local API health"
curl -fsS "${LOCAL_HEALTH_URL}" | json_health_ok >/dev/null

log "Checking public health via local Nginx"
curl -fsS --resolve "${DOMAIN}:443:127.0.0.1" "${PUBLIC_HEALTH_URL}" | json_health_ok >/dev/null

log "Checking public health via external path"
curl -fsS "${PUBLIC_HEALTH_URL}" | json_health_ok >/dev/null

log "Checking frontend shell via local Nginx"
curl -fsSI --resolve "${DOMAIN}:443:127.0.0.1" "${PUBLIC_ROOT_URL}" >/dev/null

log "Checking frontend shell via external path"
curl -fsSI "${PUBLIC_ROOT_URL}" >/dev/null

if [ "${RUN_SMOKE}" -eq 1 ]; then
  log "Running auth/share smoke flow"
  "${SCRIPT_DIR}/smoke-api.sh" "http://127.0.0.1:${API_PORT}"
fi

log "Production verification OK"
