# Pasos

Pasos is evolving from a local-only PWA into an EDUmind product with two operating modes:

- `Express`: offline-first, local-only, no real server account required.
- `Pro`: multi-device mode backed by FastAPI, PostgreSQL and server-side share codes.

As of March 20, 2026, this repository contains the legacy frontend at the repository root plus the backend and deployment baseline consolidated from the live production release.

## Current Repository Shape

```text
pasos_v2/
  src/                  React + Vite frontend source
  public/               PWA assets
  backend/              FastAPI + SQLAlchemy + Alembic API
  deploy/               nginx, systemd and DB bootstrap artifacts
  scripts/              smoke, backup and verification helpers
  docs/                 execution plan, architecture, API and runbook
```

## Production Baseline

- Public domain: `https://pasos.edumind.es`
- Active production release: `/var/www/pasos/releases/20260321_200512`
- Frontend served by nginx
- Backend served by Gunicorn/FastAPI on `127.0.0.1:9150`
- PostgreSQL with Alembic migrations

The current Git worktree is in a consolidation stage:

- frontend source still lives at repository root
- backend, deploy and runbook material are already present in this repo
- next structural step is moving the frontend into `frontend/` without breaking delivery flow

## Frontend Development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run lint
npm run build
```

## Backend Development

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Key backend entrypoints:

- `backend/app/main.py`
- `backend/wsgi.py`
- `backend/alembic.ini`
- `deploy/systemd/pasos-api.service`
- `deploy/nginx/pasos.edumind.es.conf`

## Key Documents

- [Execution plan](docs/PLAN_EJECUCION_PRODUCTO.md)
- [Production status](docs/STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API contract](docs/API.md)
- [Runbook](docs/RUNBOOK.md)
- [Security baseline](docs/SECURITY.md)

## Validation

Frontend:

```bash
npm run lint
npm run build
```

Backend:

```bash
cd backend
python -m pytest -q
```

Operational smoke:

```bash
bash scripts/smoke-api.sh http://127.0.0.1:9150
```

## Source Of Truth Rules

- runtime secrets do not live in Git
- production deploys must come from a release directory, not from a mutable worktree
- `docs/STATUS.md` must reflect the actual production baseline
- Express mode must not claim capabilities that only exist in Pro mode

### Sensors

```typescript
const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8, // Prevent accidental drags
        },
    })
);
```

### Drag Events

1. **onDragStart**: Store the dragged task ID
2. **onDragOver**: Track the target column
3. **onDragEnd**: Execute the `moveTask` action

```typescript
const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !targetColumnId) return;
    
    moveTask(active.id as string, targetColumnId);
    setTargetColumnId(null);
};
```

---

## 📦 Local Storage

### Storage Keys

- `pasos-v2-storage`: Main Zustand persist key
- `pasos-theme`: Theme preference (deprecated, now in Zustand)
- `pwa-install-dismissed`: Timestamp of last install prompt dismissal

### Data Persistence

All state updates are automatically saved to LocalStorage via Zustand's persist middleware:

```typescript
persist(
    (set, get) => ({...}),
    {
        name: 'pasos-v2-storage',
        storage: createJSONStorage(() => localStorage),
    }
)
```

---

## 🔌 Third-Party Integrations

### ARASAAC API

**Endpoint**: `https://api.arasaac.org/v1/pictograms/search/` 

**Usage**: Search pictograms by keyword (Spanish)

```typescript
const searchPictograms = async (query: string) => {
    const response = await fetch(
        `https://api.arasaac.org/v1/pictograms/es/search/${query}`
    );
    return response.json();
};
```

**Image URLs**: `https://api.arasaac.org/v1/pictograms/{id}`

### YouTube Embeds

YouTube URLs are detected and can be embedded in attachments.

---

## 🛠️ Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Server runs on: `http://localhost:5174/`

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create/Edit/Delete tasks
- [ ] Drag tasks between columns
- [ ] Add pictograms from ARASAAC
- [ ] Upload local images (<500KB)
- [ ] Add URL/video attachments
- [ ] Change themes (Professional ↔ Student)
- [ ] Export board data
- [ ] Install as PWA
- [ ] Test offline functionality
- [ ] Create/Switch boards

### Automated Testing (TODO)

- Unit tests for store actions
- Component tests with React Testing Library
- E2E tests with Playwright

---

## 🏁 Deployment

### Release-Based Deployment

The frontend can still be built as a SPA, but the product is no longer a static-only app.

- `Express` can run as a local-first frontend experience.
- `Pro` requires the FastAPI backend, PostgreSQL, secure cookies and release-based deployment behind nginx.
- Production deploys must be applied from a staged release via `deploy/deploy.sh`.

### Environment Variables

The frontend can run with default settings in local development, but `Pro` and production require backend/runtime configuration.

- Frontend:
  - optional `VITE_PASOS_API_BASE_URL`
- Backend/runtime:
  - `PASOS_DATABASE_URL`
  - `PASOS_JWT_SECRET_KEY`
  - `PASOS_REFRESH_JWT_SECRET_KEY`
  - cookie, CORS and public base URL settings

### HTTPS Requirement

PWA features (Service Worker, Install Prompt) require HTTPS in production.

### Build Script

```json
{
  "scripts": {
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## 🔒 Security Considerations

### Current Status

- ✅ `Express` remains offline-first and local-first
- ✅ `Pro` has backend auth, refresh rotation and server-side persistence
- ✅ CSP and hardened response headers are active in production
- ⚠️ Local work and part of learner continuity still depend on browser storage
- ⚠️ The product is no longer a static-only app, so backend and edge hardening matter

### Planned Enhancements (Phase 3: Security)

- 🔄 tighten public API docs exposure policy
- 🔄 expire/revoke public `ICS` feeds
- 🔄 harden storage messaging and local protection UX
- 🔄 add concurrency/load baselines and stronger staging gates

---

## 📈 Performance Optimizations

### Code Splitting

Vite automatically splits vendor chunks:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable']
      }
    }
  }
}
```

### Service Worker Caching

- Static assets cached on install
- API responses cached on runtime
- Cache-first strategy for instant load

### Lazy Loading (TODO)

- Dynamic imports for modal components
- Route-based code splitting

---

## 🐛 Known Issues

1. **Automated drag-and-drop testing**: Pixel-based dragging doesn't trigger `@dnd-kit` events reliably. Manual testing required.
2. **LocalStorage limits**: Most browsers limit LocalStorage to ~5-10MB. With Base64 images, this limit can be reached quickly.
3. **Theme switcher automation**: Native `<select>` elements can't be programmatically interacted with for automated testing.

---

## 🗺️ Roadmap

See `PLAN_EXPANSION.md` for detailed expansion plan.

### Phase 1: PWA (✅ Completed)
- Manifest, Service Worker, Icons
- Install prompt
- Offline functionality

### Phase 2: Student Theme (✅ Completed)
- Theme system architecture
- Professional and Student themes
- Dynamic CSS variables
- Theme switcher component

### Phase 3: Security (⏳ Planned)
- Local data encryption
- Optional authentication
- Input validation
- Secure export/import

### Phase 4: Distribution (⏳ Planned)
- Optimized build pipeline
- Packaging scripts
- Installation documentation
- EDUmind web distribution page

---

## 🤝 Contributing

This project is part of the EDUmind ecosystem. For contributions:

1. Fork the repository
2. Create a feature branch
3. Follow existing code style
4. Write clear commit messages
5. Submit a pull request

---

## 📄 License

**GNU Affero General Public License v3.0 (AGPL-3.0)**

This ensures the code remains free and open-source.

---

## 👥 Credits

**Developed by**: EDUmind Team  
**ARASAAC Pictograms**: Gobierno de Aragón (CC BY-NC-SA)  
**Libraries**: React, Zustand, dnd-kit, Lucide, Tailwind CSS

---

**Version**: 2.0.0  
**Last Updated**: December 2025
