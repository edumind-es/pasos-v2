# Release Checklist

Fecha de referencia: 2026-03-21

## Automatizable

- `npm run lint`
- `npm run test:run`
- `npm run test:e2e`
- `npm run build`
- `python3 -m pytest -q backend/tests`
- `python3 -m compileall backend/app`
- `npm run qa:release`
- `./scripts/staging_smoke.sh` con `STAGING_BASE_URL` si existe entorno staging
- `python3 scripts/pilot_simulation_report.py`
  - simulacion integral de centro piloto sobre base efimera local
- `PILOT_ALLOW_WRITE=1 ./scripts/pilot_center_smoke.sh <base-url>`
  - solo en staging o entorno aislado con permisos para crear datos de piloto

## Validación funcional manual

- Login Express, Local con nombre y Pro sin bloqueos.
- Restauración de sesión Pro al recargar.
- Creación, edición, duplicado y guardado como plantilla del tablero.
- Exportación de `Backup JSON` e `Informe`.
- Compartir tablero local y Pro.
- Acceso de alumnado con alias opcional.
- Registro de progreso remoto en enlaces Pro.
- Centro de datos: exportar telemetría, limpiar datos operativos, reset de PWA.
- Panel ejecutivo: filtros, avance por proyecto, documentos pendientes, hitos vencidos y exportacion CSV.

## Accesibilidad AA

- Navegación completa por teclado en login, tablero, modales y centro de datos.
- Foco visible en botones, inputs y diálogos.
- Verificación de lectura comprensible en móvil y escritorio.
- Prueba con reducción de movimiento del sistema.
- Revisión manual de contraste en tema profesional y modo e-ink.

## Release operativa

- Confirmar migraciones Alembic pendientes antes de desplegar backend.
- Verificar variables de entorno en `/etc/edumind/pasos.env`.
- Confirmar `systemd` y `nginx` con la release activa.
- Validar `/api/v1/health` y flujo de login Pro en staging o producción.
- Ejecutar rollback documentado si falla cualquiera de los checks.

## Riesgos abiertos

- Falta ejecutar el smoke de staging contra un entorno desplegado estable con variables reales.
- Falta ampliar la batería backend a concurrencia real multiusuario y caducidad compleja de shares en entorno distribuido.
- Dependencias frontend deben revisarse periódicamente con `npm audit`.
- Falta validar un piloto humano con docentes, coordinación y dirección fuera de la simulación técnica.
