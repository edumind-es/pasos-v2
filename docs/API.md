# Pasos API Design

Base path: `/api/v1`

OpenAPI artifact: `docs/openapi-v1.json`

## Standards

- DTOs use Pydantic with `extra="forbid"`
- Validation errors are explicit and fail closed
- Error envelope:

```json
{
  "error": {
    "code": "invalid_token",
    "message": "Access token is invalid or expired",
    "request_id": "..."
  }
}
```

## Endpoints

### Health

- `GET /api/v1/health`

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Boards

- `GET /api/v1/boards`
- `POST /api/v1/boards`
- `GET /api/v1/boards/{board_id}`
- `PUT /api/v1/boards/{board_id}`
- `DELETE /api/v1/boards/{board_id}`

### Shares

- `POST /api/v1/boards/{board_id}/share`
- `GET /api/v1/share/{code}`

## Auth contract

- Access token:
  - JWT bearer
  - short TTL
  - sent in `Authorization`

- Refresh token:
  - rotated on each refresh
  - HttpOnly cookie
  - revocable in DB

- CSRF:
  - double-submit cookie pattern
  - required on refresh/logout and any cookie-authenticated state-changing flow

## CORS

- single production origin: `https://pasos.edumind.es`
- credentials enabled only for that explicit origin

## Board payload strategy

- `snapshot` stores `columns` and `tasks` as JSON/JSONB
- keeps Sprint 1 migration cost low
- avoids early over-modeling
- preserves compatibility with the existing Express board shape

