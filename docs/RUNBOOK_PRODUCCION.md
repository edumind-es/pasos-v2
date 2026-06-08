# Pasos Production Runbook

## Scope

Single source of truth: this repository. Runtime layout:

```text
/var/www/pasos/
  releases/<timestamp>/
  current -> releases/<timestamp>
  previous -> releases/<timestamp>
  shared/.venv/
```

Service: `pasos-api.service`
Local API health: `http://127.0.0.1:9150/api/v1/health`
Public health: `https://pasos.edumind.es/health`

## Golden deploy

1. From the repo root stage a release with the supported script:

```bash
bash deploy/deploy.sh
```

This installs frontend dependencies, builds the frontend, runs backend checks, and stages a release under `.build/releases/<timestamp>`.

2. Validate the staged release without touching production:

```bash
bash scripts/verify_production.sh --local --stage-dir /var/www/pasos_v2/.build/latest
```

3. Apply the staged release as root:

```bash
sudo /var/www/pasos_v2/deploy/deploy.sh --apply --from-stage /var/www/pasos_v2/.build/latest
```

The apply step:

- copies the staged release into `/var/www/pasos/releases/<timestamp>`
- installs runtime dependencies into `/var/www/pasos/shared/.venv`
- installs systemd and Nginx artifacts
- runs `alembic upgrade head`
- updates `current` atomically
- restarts `pasos-api.service`
- reloads Nginx
- auto-rolls back `current` if post-cutover health fails

## Verification

Read-only checks:

```bash
bash scripts/verify_production.sh
```

Optional auth/share smoke:

```bash
./scripts/verify_production.sh --smoke-auth
```

## Logs

```bash
journalctl -u pasos-api -n 100 --no-pager
tail -n 100 /var/log/nginx/pasos.error.log
tail -n 100 /var/log/nginx/pasos.access.json
```

## Rollback

Preferred rollback is code-only unless a migration explicitly requires DB restore.

```bash
PREVIOUS_TARGET="$(readlink -f /var/www/pasos/previous)"
ln -sfn "$PREVIOUS_TARGET" /var/www/pasos/current
systemctl restart pasos-api
systemctl reload nginx
```

Then verify:

```bash
curl -fsS http://127.0.0.1:9150/api/v1/health
curl -fsS https://pasos.edumind.es/health
```

## Rules

- Never edit `/var/www/pasos/current` manually.
- Never deploy from a dirty working tree.
- Never store secrets in Git; use `/etc/edumind/pasos.env`.
- Build first, cut over second, verify immediately.
