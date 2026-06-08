# Pasos

Pasos is an EDUmind educational planning app for multimodal project boards,
classroom workflows and accessible visual organization.

This public repository is a sanitized source release for code review,
educational reuse and community audit. Production secrets, deployment
configuration, private runbooks, backups and uploaded user content are not
included.

## Development

Frontend:

```bash
npm install
npm run dev
npm run build
```

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Use placeholder configuration only. Generate fresh secrets for any real
deployment.

## Release Scope

See `OPEN_SOURCE_RELEASE.md` for what is included and excluded.

## License

Licensed under `AGPL-3.0-or-later OR EUPL-1.2`.

EDUmind(R), logos and brand assets are reserved. See `TRADEMARKS.md`.
