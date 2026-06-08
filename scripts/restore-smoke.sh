#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${1:-https://pasos.edumind.es}"
LOCAL_API_URL="${2:-http://127.0.0.1:9150}"

echo "1. Public health"
curl -fsS "${PUBLIC_URL}/health" | python3 -c "import json,sys; data=json.load(sys.stdin); assert data['status']=='ok'; print(data['status'])"

echo "2. Local API health"
curl -fsS "${LOCAL_API_URL}/api/v1/health" | python3 -c "import json,sys; data=json.load(sys.stdin); assert data['status']=='ok'; print(data['app'])"

echo "3. Frontend shell"
curl -fsSI "${PUBLIC_URL}/" | head -n 5

echo "Restore smoke OK"

