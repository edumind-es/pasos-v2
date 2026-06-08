# Pasos Security Notes

## Threat model summary

### Relevant OWASP-style risks

- Broken authentication if client-only auth were kept
- Sensitive data exposure through logs or repo secrets
- Injection through unchecked inputs and raw URLs
- CSRF on refresh/logout if cookies are used
- Excessive sharing or brute force against share codes
- Misleading privacy claims

## Controls in Sprint 1

- FastAPI backend for trusted auth and share validation
- Refresh-token rotation with DB revocation
- CSRF double-submit check for cookie-auth flows
- Pydantic strict DTO validation
- Nginx rate limits plus app-side fallback limiter
- CSP without `unsafe-eval`
- secrets only through `/etc/edumind/pasos.env`
- privacy-preserving structured logs

## Cookies and tokens

- Access token in `sessionStorage`
  - short lived
  - suited for SPA and native clients

- Refresh token in HttpOnly cookie
  - avoids exposing the long-lived token to JS
  - requires CSRF defense

Justification:

- This keeps mobile/API clients compatible while reducing the blast radius of browser XSS against the refresh token.

## Logging policy

Allowed:

- request id
- method, path, status, duration
- hashed IP for refresh token records
- truncated user agent

Never log:

- passwords
- JWTs
- refresh tokens
- CSRF tokens
- full board content unless explicitly debugging in a non-production environment

## Security checklist

- [ ] `PASOS_JWT_SECRET_KEY` rotated and strong
- [ ] `PASOS_REFRESH_JWT_SECRET_KEY` rotated and distinct
- [ ] env file owned by `root:www-data` with `0640`
- [ ] Nginx headers enabled
- [ ] `limit_req` active for auth and API
- [ ] `CORS_ALLOW_ORIGINS` restricted to production origin
- [ ] TLS managed by certbot or equivalent
- [ ] DB backups encrypted at rest
- [ ] restore tested before production cutover

