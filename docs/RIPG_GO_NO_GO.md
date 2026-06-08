# RIPG GO/NO GO

Sistema operativo para validar despliegues de Pasos con `ripgrep` antes de dar por bueno un cambio en produccion.

## Comandos

```bash
npm run ripg:local
```

Compila la app y valida el `dist` candidato local.

```bash
npm run ripg:live
```

Valida produccion viva contra el `dist` candidato local existente.

```bash
npm run ripg:go-nogo
```

Compila, inspecciona `dist`, descarga `https://pasos.edumind.es/` y sus assets JS/CSS, consulta `/health`, compara assets locales contra assets vivos y emite decision.

## Decision

- **GO**: no hay bloqueos. El build local es valido, el health publico responde OK y produccion sirve los mismos assets JS/CSS que el candidato local.
- **NO GO**: hay bloqueos. No desplegar o no cerrar el despliegue hasta resolverlos.
- **WARN**: aviso no bloqueante. Conviene revisarlo, pero no impide GO.

## Que valida

- `rg` esta disponible en el servidor.
- `dist/index.html` existe y referencia assets JS/CSS presentes.
- El build contiene marcadores criticos de producto e integraciones:
  - `Pasos`
  - `Planificador`
  - `EDUmind`
  - `ARASAAC`
  - `api.arasaac.org`
  - `/api/v1`
  - `Privacidad`
- No aparecen marcadores locales o de staging prohibidos en el build ni en produccion viva:
  - `localhost:5173`
  - `localhost:9150`
  - `127.0.0.1:9150`
  - `0.0.0.0:9150`
  - `staging.pasos.test`
- Produccion viva responde correctamente en `/health`.
- Produccion viva sirve los mismos assets JS/CSS que `dist/index.html`.

## Reportes

Cada ejecucion deja un informe en:

```text
run/ripg_go_nogo_YYYYMMDD_HHMMSS/RIPG_GO_NO_GO_REPORT.md
```

Ese informe es la evidencia GO/NO GO del despliegue.

## Uso recomendado tras cambios en dev

1. Aplicar cambios en `src/`, `public/`, `backend/`, `deploy/` o configuracion.
2. Ejecutar `npm run ripg:local`.
3. Desplegar el candidato mediante el procedimiento de Pasos.
4. Ejecutar `npm run ripg:live` o `npm run ripg:go-nogo`.
5. Solo cerrar el despliegue como correcto si el resultado final es **GO**.

Para validar otro dominio o ruta:

```bash
PROD_URL=https://pasos.edumind.es npm run ripg:go-nogo
```

Para validar otro directorio de salida:

```bash
DIST_DIR=/var/www/pasos/current/frontend/dist npm run ripg:live
```

Para cambiar el endpoint de salud:

```bash
HEALTH_PATH=/health npm run ripg:live
```
