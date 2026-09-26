# Pasos

Planificación educativa en tableros de proyecto multimodales: secuencias didácticas, flujos de aula y organización visual accesible. Backend en FastAPI, frontend en React.

> Pensado para preparar una unidad didáctica de un vistazo y poder proyectarla tal cual delante del grupo.

## Arrancar en local

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

Usa solo configuración de ejemplo. Genera secretos nuevos para cualquier despliegue real.

## Pruebas

```bash
npm run test:run     # frontend (vitest)
npm run build        # incluye el chequeo de tipos
cd backend && pytest # backend
npx playwright test  # e2e (arranca el servidor de desarrollo y el build)
```

## Cómo modificarlo

- **Plantillas de tablero**: `src/utils/boardTemplates.ts` (`BUILT_IN_BOARD_TEMPLATES`).
  Columnas por defecto de cada tipo de tablero: `src/utils/boardPresets.ts`.
- **Plantilla de sesión `.md`** (la que se arrastra sobre el tablero): `src/utils/sessionTemplate.ts`;
  el prompt para generarla está en `src/components/FAQ.tsx`.
- **Analizadores del «Asistente IA»** (listas, guiones, Markdown → tareas; no usan IA):
  `src/utils/parsers.ts`, con sus pruebas en `parsers.test.ts`.
- **Fuente de pictogramas**: `src/utils/arasaac.ts` (búsqueda y URL de imagen). Si tu uso es
  comercial, cambia aquí la fuente: ARASAAC es CC BY-NC-SA (ver [CREDITS.md](CREDITS.md)).
- **Tema y contraste**: tokens en `src/index.css` (`@theme`) y `src/styles/eink.css`
  (tinta electrónica); el sistema Lámina vive vendorizado en `public/vendor/lamina-v1.css`.
- **Tipografías**: `public/fonts/` con sus `@font-face` en `src/index.css` y su licencia en
  `public/fonts/OFL.txt`.
- **Textos que ve el alumnado**: tutorial `src/components/InteractiveManual.tsx`, ayuda
  `src/components/FAQ.tsx`, apodos `src/utils/apodoAlumno.ts`.
- **Desactivar el modo Pro**: la app funciona entera en Express/Local sin backend. Si no
  despliegas la API, la portada seguirá ofreciendo «Modo Pro» pero fallará al conectar; para
  quitar la opción edita `src/pages/Login.tsx`. La URL de la API se cambia con
  `VITE_PASOS_API_BASE_URL` (por defecto `/api/v1`, `src/services/api/http.ts`).
- **Compilar**: `npm run build` deja la PWA en `dist/` (service worker incluido). Sírvela
  como estático; el backend es opcional.

## Hecho con IA

Este recurso se ha desarrollado con *vibe coding* con asistencia de IA (Claude Code y
ChatGPT), siguiendo la [política de IA de EDUmind](https://edumind.es/es/legal/ia). Lo que
ha comprobado el autor:

- Pruebas automáticas: 86 unitarias de frontend (vitest, 17 ficheros), 63 de backend
  (pytest) y 10 e2e con Playwright (acceso, tablero, PWA, arrastrar sesión), en verde.
- CI en GitHub Actions en cada push y PR: lint, tipos, pruebas, build y auditoría de
  dependencias que llegan al navegador (`.github/workflows/ci.yml`).
- Revisión de licencias y créditos del material ajeno (ARASAAC, tipografías, librerías).
- Revisión de los textos que ve el alumnado (tutorial, FAQ, apodos) y de la guía de usuario.
- Ejecución en navegador de escritorio y móvil, instalada como PWA, y auditoría automática de
  accesibilidad (axe) sobre el build.
- Pasos no usa ningún modelo de IA en tiempo de ejecución: el «Asistente IA» es un analizador
  de texto local.

## Colaborar

Se puede colaborar **sin programar**: contar cómo te ha ido en clase, reportar un fallo, revisar los textos o traducir. Todo el proyecto está en español. Empieza por [CONTRIBUTING.md](CONTRIBUTING.md) y el [código de conducta](CODE_OF_CONDUCT.md).

¿Un fallo de seguridad? No abras un issue público: ver [SECURITY.md](SECURITY.md).

Este repositorio es una *release saneada* para revisión y auditoría: no incluye secretos, configuración de despliegue ni datos de aula. Ver [OPEN_SOURCE_RELEASE.md](OPEN_SOURCE_RELEASE.md).

## Licencia

Licencia doble **AGPL-3.0-or-later** *o* **EUPL-1.2**, a elección de quien la reutilice. Ver [LICENSE](LICENSE) y [NOTICE](NOTICE).

Material de terceros (pictogramas de ARASAAC, tipografías OFL, librerías): [CREDITS.md](CREDITS.md).
Por qué funciona así: [DECISIONES.md](DECISIONES.md). Cambios por versión: [CHANGELOG.md](CHANGELOG.md).
Guía de uso: [GUIA_USUARIO.md](GUIA_USUARIO.md). Datos: [PRIVACIDAD.md](PRIVACIDAD.md).

EDUmind® es marca registrada en España (OEPM). El código es libre; la marca y los logotipos no se ceden con él — ver [TRADEMARKS.md](TRADEMARKS.md).

Por **Luis Vilela Acuña** — maestro de Educación Física.
