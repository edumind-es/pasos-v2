#!/usr/bin/env bash
set -euo pipefail

STAMP="$(date -u +%Y%m%d_%H%M%S)"
ROOT_DIR="${1:-/var/backups/pasos}"
TARGET_DIR="${ROOT_DIR%/}/${STAMP}"
APP_ROOT="${APP_ROOT:-/var/www/pasos}"
ENV_FILE="${ENV_FILE:-/etc/edumind/pasos.env}"

mkdir -p "$TARGET_DIR"

echo "Creating filesystem snapshot in $TARGET_DIR"

if [ -L "${APP_ROOT}/current" ]; then
  CURRENT_RELEASE="$(readlink -f "${APP_ROOT}/current")"
  tar -C "$CURRENT_RELEASE" -czf "${TARGET_DIR}/release.tgz" .
fi

if [ -f "$ENV_FILE" ]; then
  install -m 0600 "$ENV_FILE" "${TARGET_DIR}/pasos.env.snapshot"
fi

if [ -f /etc/nginx/sites-available/pasos.edumind.es ]; then
  install -m 0644 /etc/nginx/sites-available/pasos.edumind.es "${TARGET_DIR}/pasos.nginx.conf"
fi

if [ -f /etc/systemd/system/pasos-api.service ]; then
  install -m 0644 /etc/systemd/system/pasos-api.service "${TARGET_DIR}/pasos-api.service"
fi

if [ -f "$ENV_FILE" ]; then
  export PASOS_DATABASE_URL
  PASOS_DATABASE_URL="$(grep '^PASOS_DATABASE_URL=' "$ENV_FILE" | cut -d= -f2-)"
  if [ -n "${PASOS_DATABASE_URL:-}" ]; then
    python3 - <<'PY' "$PASOS_DATABASE_URL" "${TARGET_DIR}/pasos.sql.gz"
import gzip
import os
import subprocess
import sys
from urllib.parse import urlparse

url = sys.argv[1]
output = sys.argv[2]
parsed = urlparse(url.replace("+psycopg", ""))
env = os.environ.copy()
if parsed.password:
    env["PGPASSWORD"] = parsed.password

command = [
    "pg_dump",
    "--host", parsed.hostname or "127.0.0.1",
    "--port", str(parsed.port or 5432),
    "--username", parsed.username or "postgres",
    "--dbname", parsed.path.lstrip("/"),
    "--no-owner",
    "--no-privileges",
]
with gzip.open(output, "wb") as fh:
    subprocess.run(command, check=True, env=env, stdout=fh)
PY
  fi
fi

echo "Snapshot created at $TARGET_DIR"

