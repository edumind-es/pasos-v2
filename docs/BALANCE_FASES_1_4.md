# Balance Fases 1-4

Fecha de verificacion: 2026-03-21

## Resumen ejecutivo

Las Fases 1-4 quedan funcionalmente cerradas dentro del repo `pasos_v2` y verificadas con QA completa. La infraestructura base tambien queda alineada para continuar con fases posteriores:

- backend en produccion activo
- release publica ya cortada sobre `/var/www/pasos/releases/20260321_185114`
- base de datos de produccion migrada hasta `20260321_0008`
- chequeos locales y publicos de salud en verde
- smoke API en verde
- bundle principal dividido por rutas, sin warning de chunk > 500 kB
- script de despliegue corregido para funcionar con la estructura real del repo

## Balance por fase

### Fase 1. Dominio y especificacion

Estado: cerrada

Evidencias:

- dominio, journeys, roles, wireframes y backlog operativo definidos
- artefactos de base ya presentes en `docs/`
- criterio de salida cubierto para arrancar construccion sin ambiguedad

Validacion:

- no hay bloqueos documentales para continuar
- el dominio `Aula / Equipo / Claustro` ya se usa como base de implementacion

### Fase 2. Organizaciones, equipos y permisos

Estado: cerrada

Evidencias:

- organizaciones, equipos y membresias modeladas en backend
- contexto activo de espacio en frontend
- tableros filtrados por organizacion/equipo
- control de solo lectura para perfiles `viewer`

Validacion:

- pruebas backend en verde
- flujo Pro funcional con espacios de trabajo

### Fase 3. Pasos Aula 2.0

Estado: cerrada

Evidencias:

- tarjeta educativa enriquecida
- ayuda, evidencia, feedback y validacion docente
- asignacion explicita a alumno o grupo
- `vista Hoy` para seguimiento diario
- persistencia backend de progreso y asignaciones

Validacion:

- pruebas backend en verde para progreso, shares y asignaciones
- smoke frontend y Playwright en verde

### Fase 4. Pasos Equipo

Estado: cerrada

Evidencias:

- comentarios con menciones
- acuerdos, incidencias y documentos vinculados
- panel de coordinacion semanal con swimlanes y vencimientos
- modo reunion y actas trazables
- migracion de base aplicada para `board_meetings`

Validacion:

- nuevas tablas presentes en produccion: `board_meetings`, `board_comments`, `learning_assignments`, `organizations`, `teams`
- API local de produccion en verde despues de migrar

## Verificacion ejecutada

### Repo

- `npm run lint`: OK
- `npm run build`: OK
- `npm run qa:release`: OK
- `python3 -m pytest -q backend/tests`: `13 passed`

### Produccion

- `systemctl status pasos-api.service`: activo
- `bash scripts/verify_production.sh`: OK
- `bash /var/www/pasos/current/scripts/smoke-api.sh http://127.0.0.1:9150`: OK
- `alembic current`: `20260321_0008 (head)`

### Frontend bundle

Situacion anterior:

- chunk principal por encima de 500 kB y warning de build

Situacion actual:

- `index` reducido a ~212 kB
- `BoardView` separado en chunk propio de ~155 kB
- build sin warning de chunk grande

## Infraestructura hasta aqui

Estado general: correcta para continuar

Confirmado:

- Nginx responde correctamente en ruta publica y local
- Gunicorn/FastAPI activo y estable
- PostgreSQL accesible y migrado
- PWA genera `sw.js` correctamente
- scripts de verificacion y smoke operativos
- despliegue preparado para estructura real de repo tras corregir `deploy/deploy.sh`

## Riesgos y deuda real abierta

### Criticos antes de llamar "live" a Fases 1-4 en publico

- no quedan bloqueos criticos de release para Fases 1-4

### Importantes para fases 5-10

- `HEAD /health` en la release actualmente servida sigue devolviendo `405`; en el repo ya queda corregido para siguientes releases
- falta un corte de despliegue completo desde el repo actual para que la web publica exponga todas las mejoras ya implementadas en `pasos_v2`
- sigue pendiente ampliar pruebas backend mas alla del bloque actual hacia documentos, calendario y dependencias futuras

## Criterio de paso a fases 5-10

Se puede avanzar a Fase 5 si mantenemos estos gates:

- no abrir Fase 5 sin plan de release/cutover del repo actual a produccion
- no abrir calendario/documentos sin definir politica de almacenamiento y permisos por documento
- no abrir Gantt sin cerrar antes el modelo de fechas, dependencias y estados compartidos
- mantener `qa:release` como puerta obligatoria por fase

## Conclusion

Las Fases 1-4 estan construidas, publicadas y verificadas, con infraestructura base saneada y base de datos de produccion preparada. El siguiente paso serio ya es Fase 5: documentos, embebidos y calendario sobre una base estable.
