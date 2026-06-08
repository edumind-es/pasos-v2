# Pasos Golden Path

## Signed Architecture Path

Pasos production is `systemd + shared venv + Nginx + release symlink`, not Docker.

- frontend source currently lives at repository root in `pasos_v2/`
- backend source lives in `backend/`
- release artifacts are staged under `.build/releases/<timestamp>`
- production releases live in `/var/www/pasos/releases/<timestamp>`
- `current` is the only path that Nginx and systemd should reference
- `previous` is preserved for immediate rollback

## Release Flow

1. `npm run qa:release`
2. `python3 scripts/pilot_simulation_report.py`
3. `bash scripts/verify_production.sh --local`
4. root apply with `deploy/deploy.sh --apply --from-stage ...`
5. `bash scripts/verify_production.sh --smoke-auth`

## Runtime Contracts

- systemd unit: `pasos-api.service`
- backend bind: `127.0.0.1:9150`
- Nginx root: `/var/www/pasos/current/frontend/dist`
- Nginx proxy health: `/health -> /api/v1/health`
- secrets file: `/etc/edumind/pasos.env`
- python runtime: `/var/www/pasos/shared/.venv`

## Operational Rules

- No manual edits inside `/var/www/pasos/current`
- No deploys from `/var/www/pasos_v2`
- No direct edits in `/etc/nginx` or `/etc/systemd` outside tracked deploy artifacts
- No rollback by deleting releases; switch symlink first, clean up later
- Forward-only migrations by default; DB restore only from known-good backup

## Day-2 Minimum

- pre-deploy snapshot
- health verification after every cutover
- structured logs stay enabled
- release metadata must exist in every staged release
- only tag Git after pipeline validation
