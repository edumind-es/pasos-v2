# Pasos Architecture

Last updated: 2026-03-20

## Consolidation status

- Live production already runs with `nginx + gunicorn + FastAPI + PostgreSQL`.
- `/var/www/pasos_v2` now contains that backend and deployment baseline.
- The frontend source remains temporarily at repository root while the monorepo migration is completed.

## Target shape

```text
internet
  |
  v
Nginx
  |- serves frontend build from /var/www/pasos/current/frontend/dist
  |- exposes /health -> backend /api/v1/health
  |- proxies /api/* -> 127.0.0.1:9150
  |
  v
Gunicorn + FastAPI
  |- app/api/v1
  |- app/services
  |- app/models
  |- app/core
  |
  v
PostgreSQL
```

## Modes

### Express

- No account required
- Local-first storage only
- Uses `LocalStorageAdapter`
- Works without backend
- Export/import remains available as the portability escape hatch

### Pro

- Account required
- Uses `ApiAdapter`
- Sync boundary is the backend API
- Boards, memberships and share codes live server-side
- Student progress remains device-local unless a future sprint adds explicit learner accounts

## Sync boundary

```text
UI components
  -> Zustand store
    -> StorageAdapter
       -> LocalStorageAdapter  (Express)
       -> ApiAdapter           (Pro)
```

Only the adapter knows where persistence lives. UI code mutates the same board shape in both modes.

## Layer responsibilities

### frontend/

- Rendering, accessibility, PWA and offline UX
- No trust decisions
- No fake encryption or fake server auth claims

Current repository note:

- today the frontend source is still rooted in `src/`, `public/`, `package.json` and `vite.config.ts`
- the target end-state is moving those assets under `frontend/` once release scripts are adapted

### backend/app/api/v1

- HTTP endpoints
- Pydantic DTO validation
- auth/session contract
- error mapping

### backend/app/services

- Auth and refresh rotation
- Board lifecycle
- Share-code TTL and usage checks

### backend/app/models

- SQLAlchemy persistence
- JSONB board snapshots
- ownership and membership roles

### backend/app/core

- Config and env loading
- logging
- JWT/CSRF primitives
- DB session wiring
- rate limiting

## Data model

- `users`
  - `id`
  - `email`
  - `display_name`
  - `password_hash`
  - `is_active`

- `boards`
  - `id`
  - `owner_id`
  - `title`
  - `snapshot` JSON/JSONB
  - `metadata`

- `board_memberships`
  - `board_id`
  - `user_id`
  - `role` = `owner|editor|viewer`

- `board_shares`
  - `board_id`
  - `code`
  - `permission`
  - `expires_at`
  - `revoked_at`
  - `max_uses`
  - `allow_anonymous`

- `refresh_tokens`
  - hashed token only
  - `jti`
  - `csrf_token`
  - rotation link via `rotated_from_id`
  - IP hash and truncated user agent for audit

## Auth flow

1. `POST /api/v1/auth/register` or `POST /api/v1/auth/login`
2. Backend returns:
   - short-lived access token in response body
   - refresh token in HttpOnly cookie
   - CSRF token in readable cookie
3. Frontend stores the access token in `sessionStorage`
4. Protected API calls send `Authorization: Bearer <token>`
5. If access expires, frontend attempts one refresh with cookie + `X-CSRF-Token`
6. Logout revokes the refresh token server-side

## Share flow

1. Teacher creates or updates a board
2. Teacher calls `POST /api/v1/boards/{id}/share`
3. Backend generates code, TTL and URL
4. Student opens `/codigo?code=...`
5. Frontend resolves the code via adapter:
   - local adapter in Express
   - API in Pro

## Sprint boundaries

### Sprint 1

- consolidate live backend/deploy/scripts into Git
- keep Express alive while Pro is scaffolded
- FastAPI auth/boards/share baseline
- nginx + systemd + backup + smoke scripts

### Sprint 2

- memberships UI
- audit events
- import Express boards into Pro on login
- optional learner identities

### Sprint 3

- richer observability
- background jobs if needed
- policy-driven retention and operator dashboards
