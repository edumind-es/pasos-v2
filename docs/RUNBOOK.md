# Pasos Runbook

## Release layout

```text
/var/www/pasos/
  current -> /var/www/pasos/releases/<timestamp>
  releases/
  shared/
    .venv/
```

## 0. Preconditions

- code prepared in a new release directory
- `/etc/edumind/pasos.env` present
- Postgres role and DB created
- `/var/www/pasos/shared/.venv` provisioned

## 1. Snapshot before touching production

```bash
sudo mkdir -p /var/backups/pasos
sudo bash /var/www/pasos/current/scripts/backup.sh /var/backups/pasos
```

Rollback source of truth:

- latest filesystem snapshot
- latest SQL dump
- current symlink target before cutover

## 2. Provision env file

```bash
sudo install -d -m 0750 -o root -g www-data /etc/edumind
sudo install -m 0640 -o root -g www-data /var/www/pasos/current/deploy/systemd/pasos.env.example /etc/edumind/pasos.env
sudoedit /etc/edumind/pasos.env
```

## 3. Bootstrap database

```bash
sudo -u postgres psql \
  -v pasos_db=pasos \
  -v pasos_user=pasos_user \
  -v pasos_password='CAMBIA_ESTA_PASSWORD' \
  -f /var/www/pasos/current/deploy/db/bootstrap.sql
```

## 4. Provision Python environment

```bash
python3 -m venv /var/www/pasos/shared/.venv
/var/www/pasos/shared/.venv/bin/pip install --upgrade pip
/var/www/pasos/shared/.venv/bin/pip install -r /var/www/pasos/current/backend/requirements.txt
/var/www/pasos/shared/.venv/bin/pip install -e /var/www/pasos/current/backend[dev]
```

## 5. Deploy new release atomically

Canonical path:

```bash
bash /var/www/pasos_v2/deploy/deploy.sh
```

The manual flow below is retained only as an explanatory fallback. The repository currently keeps the frontend source at repo root, so commands that assume `/frontend` should not be treated as canonical.

```bash
RELEASE_TS="$(date -u +%Y%m%d_%H%M%S)"
sudo mkdir -p "/var/www/pasos/releases/${RELEASE_TS}"
sudo rsync -a --delete /tmp/pasos-release/ "/var/www/pasos/releases/${RELEASE_TS}/"
cd "/var/www/pasos/releases/${RELEASE_TS}"
npm ci
npm run build
cd "/var/www/pasos/releases/${RELEASE_TS}/backend"
/var/www/pasos/shared/.venv/bin/alembic upgrade head
sudo ln -sfn "/var/www/pasos/releases/${RELEASE_TS}" /var/www/pasos/current
```

## 6. Install or update service definitions

```bash
sudo install -m 0644 /var/www/pasos/current/deploy/systemd/pasos-api.service /etc/systemd/system/pasos-api.service
sudo install -m 0644 /var/www/pasos/current/deploy/nginx/pasos-log-format.conf /etc/nginx/conf.d/pasos-log-format.conf
sudo install -m 0644 /var/www/pasos/current/deploy/nginx/pasos-rate-limit.conf /etc/nginx/conf.d/pasos-rate-limit.conf
sudo install -m 0644 /var/www/pasos/current/deploy/nginx/pasos.edumind.es.conf /etc/nginx/sites-available/pasos.edumind.es
sudo ln -sfn /etc/nginx/sites-available/pasos.edumind.es /etc/nginx/sites-enabled/pasos.edumind.es
sudo systemctl daemon-reload
sudo nginx -t
sudo systemctl restart pasos-api
sudo systemctl reload nginx
```

## 7. Smoke tests

```bash
curl -fsS http://127.0.0.1:9150/api/v1/health
curl -fsS https://pasos.edumind.es/health
bash /var/www/pasos/current/scripts/smoke-api.sh http://127.0.0.1:9150
bash /var/www/pasos/current/scripts/restore-smoke.sh https://pasos.edumind.es http://127.0.0.1:9150
```

## 8. Rollback

### Code rollback

```bash
PREVIOUS_RELEASE="/var/www/pasos/releases/<previous_timestamp>"
sudo ln -sfn "$PREVIOUS_RELEASE" /var/www/pasos/current
sudo systemctl restart pasos-api
sudo systemctl reload nginx
```

### Database rollback

Preferred strategy:

- restore the SQL snapshot taken immediately before cutover
- only use `alembic downgrade` if the migration is explicitly reversible and data-safe

Example:

```bash
gunzip -c /var/backups/pasos/<stamp>/pasos.sql.gz | psql "$PASOS_DATABASE_URL"
```

## Cutover target

- Build and sync the release before switching the symlink
- Keep Nginx serving the old frontend until the new build is ready
- Run migrations immediately before symlink switch
- Restart only the API service; Nginx should be `reload`
- Expected disruption: under 30 seconds
