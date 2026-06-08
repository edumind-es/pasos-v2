# Pasos Production Status

Last updated: 2026-03-23

## Live Production State

- Domain: `pasos.edumind.es`
- Frontend served by Nginx from `/var/www/pasos/current/frontend/dist`
- Backend served by Gunicorn/FastAPI on `127.0.0.1:9150`
- `systemd` unit active: `pasos-api.service`
- PostgreSQL active with Alembic migrations applied
- JWT auth active with rotating refresh tokens
- Share codes active with TTL and server-side resolution

## Active Filesystem Layout

```text
/var/www/pasos/
  releases/<timestamp>/
  current -> releases/20260323_191420
  shared/
```

Latest active release:

- Active public release: `/var/www/pasos/releases/20260323_191420`
- Previous release preserved at `/var/www/pasos/releases/20260322_194454`
- Shared runtime dependencies verified against the active release
- Alembic verified at `20260321_0009 (head)` from the active release

Shared runtime paths:

- Environment file: `/etc/edumind/pasos.env`
- Service unit: `/etc/systemd/system/pasos-api.service`
- Nginx site: `/etc/nginx/sites-available/pasos.edumind.es`
- App logs: `/var/log/pasos`

## Fase 1 Consolidation Goal

The canonical Git source was fragmented between:

- `/var/www/pasos_v2`: historical Git repo with frontend at repository root
- `/var/www/pasos/current`: live release with the real monorepo layout and backend

This branch consolidates the live production shape into a clean monorepo so that future releases can be built from Git again.

## Consolidation Decisions

- Keep legal files (`AUTHORS`, `COPYRIGHT`, `LICENSE`, `NOTICE`) at repository root.
- Preserve delivery continuity while the legacy frontend still lives at repository root.
- Prepare a later move of the frontend root into `frontend/` once release automation is in place.
- Preserve legacy frontend reference docs under `docs/archive/`.
- Add `backend/`, `deploy/`, `docs/`, and `scripts/` from the live release.
- Ignore build/runtime artifacts for both frontend and backend.
- Treat frontend build output as deployment output, not source.

## Consolidation Status On 2026-03-20

- Frontend messaging and local-only behavior were aligned to avoid fake multi-device claims.
- Frontend lint and build are green in `/var/www/pasos_v2`.
- `backend/`, `deploy/`, `scripts/` and production runbooks were imported from the active live release.
- The repository now contains the API, nginx and systemd baseline needed to continue Fases 1-3 in one place.

## Product Execution Status On 2026-03-21

- Fase 1 del roadmap `Pasos Aula / Equipo / Claustro` queda cerrada en documentación operativa con dominio, permisos, journeys, wireframes, decisiones y backlog.
- Fase 3 is operational for Pro auth, teacher board sync and server-resolved share codes.
- Fase 4 is operational in the core UI: responsive board layouts, safer dialogs and reduced fragile browser prompts.
- Fase 5 is now operational with a template library, board duplication and pedagogical report export from the teacher workspace.
- Fase 6 is now operational with a storage/observability control center, exportable telemetry and a single PWA registration strategy.
- Fase 7 is now operational as a release baseline with frontend tests, accessibility checks, a release checklist and a reproducible QA script.
- Browser E2E smoke is now active with Playwright over the teacher/student critical flows.
- Backend smoke coverage now includes share resolution, activity registration and insights/progress aggregation.
- Fase 2 is now started with backend scaffold for `organizations`, `organization_memberships`, `teams` and `team_memberships`, plus authenticated API endpoints and a first Pro context selector in the teacher UI.
- Fase 2 now also supports real team memberships, scoped boards with `organization/team/context/board_type`, board filtering by active workspace and read-only handling for viewer roles in the teacher UI.
- Fase 2 is now functionally closed with contextual board creation by workspace type, team member management in the UI and a first `Pasos Equipo` navigation layer with guided quick actions.
- Fase 3 is now functionally closed with `Pasos Aula 2.0`: educational task fields, student evidence/help flows, teacher feedback/validation, explicit assignments and a `Today` view for learner follow-up.
- Fase 4 is now functionally closed for `Pasos Equipo`: comments with mentions, agreements/incidents, linked documents, swimlane-based coordination, due-date tracking and traceable meeting minutes.
- Production database schema is now upgraded through `20260321_0008` and includes meeting notes, comments, assignments, organizations and teams.
- Repository schema head is now `20260321_0009` with first-class board documents, version history and calendar feeds `ICS`.
- Production verification is green with `scripts/verify_production.sh` and local API smoke.
- Frontend build no longer emits the main chunk size warning after route-level code splitting.
- Public cutover is now completed on `/var/www/pasos/releases/20260321_200512`.
- External smoke against `https://pasos.edumind.es` is green for health, auth, board creation, share and share resolution.
- Fase 5 of the `Pasos Aula / Equipo / Claustro` roadmap is now functionally closed in the repository with:
  - board-scoped documents and lightweight version history
  - document panel with preview, tags and task links
  - agenda route with monthly/weekly views
  - personal/team `ICS` calendar feeds
  - backend calendar event derivation from due dates and assignments
- Fase 6 of the `Pasos Aula / Equipo / Claustro` roadmap is now functionally closed in the repository with:
  - task dependencies and timeline fields in the board model
  - backend timeline overview with blocked/delayed/milestone-risk alerts
  - `Timeline/Gantt` route for personal or team workspaces
  - capacity overview by responsible owner
  - timeline validation for dependency cycles and invalid date ranges
- Fase 7 of the `Pasos Aula / Equipo / Claustro` roadmap is now functionally closed in the repository with:
  - executive dashboard route for center-wide reading
  - filters by period, team, project and responsible owner
  - cross-board aggregates for team metrics, project progress and workload
  - detection of recurring blockers, pending documents and overdue milestones
  - CSV export for executive follow-up and reporting
- Pre-pilot internal audit is now completed with:
  - production verification green
  - `npm audit --omit=dev` clean
  - pilot-center backend flow added
  - local pilot simulation artifacts exported under `.build/audit/`
  - final evaluation and pilot package documented in `docs/`
- Local verification for the new Fase 5 scope is green:
  - `python3 -m pytest -q backend/tests`: `23 passed`
  - `npm run test:run`: OK
  - `npm run test:e2e`: OK
  - `npm run build`: OK
  - `npm run qa:release`: OK
- Public deployment is now on release `20260321_200512` with Alembic at `20260321_0009`.
- Runtime dependency audit is clean with `npm audit --omit=dev`.
- Pilot-readiness audit is complete with:
  - corrected anonymous share enforcement
  - corrected student-route duplicate footer and board-card accessibility issue
  - legacy deploy path deprecated in favor of `deploy/deploy.sh`
  - repeatable pilot and production smokes using unique execution ids
  - technical pilot simulation artifacts exported under `.build/audit/pilot-simulation-20260322_121937/`
- EdTech production audit is now completed with:
  - production-control report in `docs/AUDITORIA_PRODUCCION_EDTECH_20260322.md`
  - local board isolation fixed for non-Pro users
  - share CTA disabled for unsupported team/organization spaces
  - lightweight stress probe added under `scripts/stress_probe.py`
  - external edge showing early `429` while local API health remains stable under read-only load
- Aula/Claustro separation is now implemented in the repository with:
  - dedicated home chooser before entering workspaces
  - independent routes for `Pasos Aula` and `Pasos Claustro`
  - faster classroom task entry and clearer contextual navigation
  - e-ink label semantics preserving color meaning as text
  - team invitations by Pro email or user workspace code
- Release `20260322_194454` is fully validated in repository and prepared in `/var/www/pasos/releases/` with:
- Release `20260322_194454` is now active in public production with:
  - `npm run lint`: OK
  - `npm run test:run`: OK
  - `npm run test:e2e`: OK
  - `npm run build`: OK
  - `python3 -m pytest -q backend/tests`: `24 passed`
  - `npm run qa:release`: OK
  - `bash /var/www/pasos/current/scripts/smoke-api.sh https://pasos.edumind.es`: OK
  - `bash /var/www/pasos/current/scripts/verify_production.sh --smoke-auth`: OK
- Current verification baseline:
- `npm run lint`: OK
- `npm run test:run`: OK
- `npm run test:e2e`: OK
- `npm run build`: OK
- `python3 -m pytest -q backend/tests`: OK
- `npm run qa:release`: OK
- Release `20260323_191420` is now active for frontend production with:
  - visual hierarchy centered on Kanban in the teacher workspace
  - accordionized support panels for `Pasos Aula` and `Pasos Claustro`
  - persisted panel visibility/preferences across sessions
  - production smoke green after frontend-only cutover with unchanged backend

## Runtime Notes

- Password hashing was switched to `pbkdf2_sha256` to avoid `passlib`/`bcrypt` runtime incompatibility on the current Ubuntu/Python baseline.
- `pasos-api.service` requires `LogsDirectory=pasos` so the service can start without manual log directory creation.
- `/health` is proxied by Nginx to `/api/v1/health` on the backend.

## Known Remaining Work After Fase 1

- Finish the frontend move into a dedicated `frontend/` directory.
- Reconcile remaining frontend debt and finish Express/Pro adapter cleanup.
- Add CI automation for the existing release and Playwright smoke suite.
- Validate rollback with scripted release and rollback wrappers.
