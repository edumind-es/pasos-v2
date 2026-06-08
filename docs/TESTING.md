# Testing Guide

## Frontend

- `npm run test`
  - watch mode con Vitest
- `npm run test:run`
  - ejecución única para CI o release
- `npm run test:e2e`
  - smoke E2E con Playwright sobre flujos docente/alumno en navegador real local
- `npm run lint`
  - validación estática de TypeScript/React vía ESLint
- `npm run build`
  - compilación completa Vite + TypeScript + PWA

## Backend

- `python3 -m pytest -q backend/tests`
  - smoke actual del backend, incluyendo health, shares, actividad e insights básicos
- `python3 -m compileall backend/app`
  - validación rápida de imports y sintaxis

## Release

- `npm run qa:release`
  - ejecuta lint, tests frontend, Playwright, build, pytest y compileall
- `./scripts/staging_smoke.sh`
  - smoke HTTP para staging con `STAGING_BASE_URL` y checks opcionales de login/share remoto
- `python3 scripts/pilot_simulation_report.py`
  - simulacion integral de un centro piloto sobre base efimera y export de artefactos ejecutivos
- `PILOT_ALLOW_WRITE=1 ./scripts/pilot_center_smoke.sh <base-url>`
  - smoke de escritura real para staging o entorno aislado de piloto
- `python3 scripts/stress_probe.py --url <url> --requests 200 --concurrency 20`
  - probe ligero de lectura para medir latencia, tasa de exito y señales de rate limiting sin modificar datos

## Cobertura actual de Fase 7

- Utilidades de compartir y progreso local.
- Generación de informe pedagógico.
- Accesibilidad base de diálogos clave:
  - biblioteca de plantillas
  - centro de almacenamiento y observabilidad
- E2E crítico:
  - creación de tablero desde plantilla e informe
  - apertura del centro de datos
  - acceso de alumnado por código compartido local
- Backend:
  - resolución de share code
  - registro de actividad de alumnado
  - agregación básica de progreso e insights
  - simulación integral de centro piloto con organización, equipo, tablero, asignación, documento, share, actividad e insights ejecutivos

## Próximos incrementos recomendados

- E2E sobre login Pro, compartir remoto y sincronización de progreso en backend real.
- Tests backend sobre permisos, revocación y escenarios concurrentes.
- Validación visual responsive con snapshots o Playwright.
- Smoke operativo de piloto sobre staging aislado antes de abrir el piloto humano real.
