# Informe Final de Evaluacion

Fecha: 2026-03-22

## Resumen ejecutivo

`Pasos` queda en un estado tecnicamente estable, desplegado y verificable, con `Pasos Aula`, `Pasos Equipo` y `Pasos Claustro` operativos en el repo y con release publica activa en `pasos.edumind.es`.

La conclusion no es "desplegar sin mas". La conclusion correcta es:

- `GO` para piloto controlado humano
- `NO-GO` para escalado institucional amplio sin cerrar antes los riesgos residuales del piloto

## Datos verificados

Calidad:

- `npm run lint`: `OK`
- `npm run test:run`: `OK`
- `npm run test:e2e`: `OK`
- `npm run build`: `OK`
- `python3 -m pytest -q backend/tests`: `23 passed`
- `npm run qa:release`: `OK`
- `npm audit --omit=dev`: `0 vulnerabilities`

Produccion:

- release activa: `/var/www/pasos/releases/20260321_200512`
- migracion activa: `20260321_0009 (head)`
- servicio API: `active`
- `health` publico: `200`
- smoke de auth/share: `OK`

Piloto tecnico:

- simulacion integral ejecutada
- artefactos exportados en `.build/audit/pilot-simulation-20260322_121937/`

## Cambios y mejoras aplicados en esta iteracion

- se incorporo el panel ejecutivo completo con exportacion CSV
- se anadio una prueba backend integral de piloto de centro
- se creo una simulacion reproducible de piloto tecnico
- se creo un smoke de piloto para entornos aislados
- se actualizaron checklist y guia de testing para incluir readiness de piloto y panel ejecutivo
- se hizo cumplir la politica de comparticion anonima en backend y UI
- se corrigio la tarjeta principal para evitar controles interactivos anidados y mejorar etiquetado accesible
- se elimino el footer duplicado en rutas de alumnado
- se deprecio la ruta legacy de despliegue para forzar el camino canonico de release
- se mejoro la repetibilidad de los smokes con identificadores unicos por ejecucion

## Riesgos residuales

### Altos

- falta piloto humano real con usuarios educativos
- falta `staging smoke` sobre entorno aislado y persistencia separada
- los feeds `ICS` siguen siendo enlaces bearer sin expiracion ni revocacion

### Medios

- falta E2E real sobre login Pro, share remoto y dashboard ejecutivo contra backend real
- falta baseline de concurrencia y carga
- falta validacion manual de accesibilidad en dispositivos reales
- la UI de seguridad local necesita un mensaje mas preciso sobre lo que protege y lo que no
- falta decidir si `/api/docs` y `/api/openapi.json` deben seguir expuestos en produccion

### Bajos

- seguir revisando dependencias frontend con `npm audit`
- seguir ampliando cobertura backend a expiracion avanzada de shares y escenarios distribuidos
- endurecer permisos de escritura del arbol de releases en `/var/www/pasos`

## Decision recomendada

### Fase siguiente

Abrir piloto humano controlado.

### No hacer todavia

- no abrir adopcion general de centro completo
- no comunicar cierre definitivo del producto sin backlog postpiloto

## Entrega llave en mano disponible

Documentacion base:

- `docs/PLAN_EJECUCION_PRODUCTO.md`
- `docs/ROADMAP_PASOS_AULA_CLAUSTRO.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/TESTING.md`
- `docs/AUDITORIA_INTERNA_PREPILOTO_20260322.md`
- `docs/PILOTO_CONTROLADO_CENTRO_20260322.md`

Herramientas operativas:

- `scripts/verify_production.sh`
- `scripts/smoke-api.sh`
- `scripts/staging_smoke.sh`
- `scripts/pilot_simulation_report.py`
- `scripts/pilot_center_smoke.sh`

## Backlog recomendado de mejoras

### P1

- ejecutar piloto humano real
- correr smoke de piloto en `staging`
- añadir E2E Pro sobre auth/share/dashboard

### P2

- validar accesibilidad con lector de pantalla y movil real
- medir concurrencia y carga
- consolidar tablero de metricas de uso del piloto
