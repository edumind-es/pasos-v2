# Plan de Ejecucion del Producto

Fecha de arranque: 2026-03-20
Rol de direccion: Project Leader

## Objetivo

Entregar Pasos como producto llave en mano, con:

- frontend estable y accesible
- backend para compartir y seguimiento real
- despliegue profesional y observable
- proteccion de datos alineada con uso educativo
- operacion offline-first con sincronizacion segura

## Equipo funcional

- Frontend senior: arquitectura UI, PWA, estado, componentes, responsive y DX.
- Backend senior: API, persistencia, autorizacion, compartir y progreso de alumnado.
- DevOps parcial: entornos, CI/CD, observabilidad, backups y seguridad operativa.
- UX/accesibilidad parcial: experiencia docente/alumno, WCAG, flujos criticos y copy honesto.

## Cadencia

- Ciclo semanal de entrega.
- Cierre de fase solo con criterios de aceptacion verificables.
- Ninguna feature nueva entra si rompe honestidad de producto, lint, build o despliegue.
- La evolucion hacia `Pasos Aula`, `Pasos Equipo` y `Pasos Claustro` se desarrolla en `docs/ROADMAP_PASOS_AULA_CLAUSTRO.md`.

## Fases

### Fase 0. Saneamiento y gobierno tecnico

Objetivo:
- alinear producto real, codigo, documentacion y despliegue

Entregables:
- backlog P0/P1/P2
- arquitectura actual y arquitectura objetivo
- mensajes de producto honestos
- build estable
- reduccion progresiva de deuda tecnica de lint

### Fase 1. Infraestructura profesional

Objetivo:
- definir y automatizar la arquitectura real de produccion

Entregables:
- frontend, API y almacenamiento definidos
- entornos dev/staging/prod
- healthchecks reales
- pipeline CI/CD
- rollback y backups

### Fase 2. Proteccion de datos y seguridad

Objetivo:
- pasar de seguridad nominal a seguridad operativa

Entregables:
- autenticacion y autorizacion reales
- almacenamiento seguro
- exportacion/importacion segura
- borrado y retencion de datos
- consentimiento y textos legales segun alcance funcional

### Fase 3. Gestion educativa y compartir real

Objetivo:
- habilitar trabajo real docente/alumno entre dispositivos

Entregables:
- aulas, grupos, tableros asignados
- codigos y enlaces reales con expiracion y revocacion
- progreso por estudiante
- historial minimo de actividad

### Fase 4. Frontend, CSS y resiliencia multi-dispositivo

Objetivo:
- experiencia consistente en movil, tablet, escritorio, presentacion y e-ink

Entregables:
- layout adaptativo
- componentes accesibles
- design system estable
- eliminacion de flujos fragiles con `prompt` y `confirm` donde aplique

### Fase 5. Funcionalidad EdTech profesional

Objetivo:
- convertir la app en producto usable por centros, docentes y familias

Entregables:
- panel docente
- biblioteca de plantillas
- seguimiento de progreso
- exportaciones pedagogicas
- gestion de evidencias y reutilizacion

### Fase 6. Logs, cookies, cache y observabilidad

Objetivo:
- operacion fiable y trazable

Entregables:
- logs estructurados
- metricas y alertas
- politica de almacenamiento y cookies
- estrategia unica de cache y service worker

### Fase 7. QA, hardening y release

Objetivo:
- cerrar una release candidata a entrega

Entregables:
- tests unitarios, integracion y E2E
- accesibilidad AA
- checklist de release
- documentacion de operacion y soporte

Estado operativo a 2026-03-23 para este cierre:

- La separacion entre `Pasos Aula` y `Pasos Claustro` ya esta implementada con home previo de eleccion de workspace.
- El modo `e-ink` ya conserva la semantica del color mediante etiquetas textuales en las tarjetas.
- La gestion de equipos ya admite alta de profesorado por correo Pro o por codigo de usuario.
- La release de este bloque ya esta activa en produccion en `/var/www/pasos/releases/20260323_191420`.
- La release previa queda preservada en `/var/www/pasos/releases/20260322_194454`.
- La verificacion post-cutover ya es verde con `smoke-api.sh` y `verify_production.sh --smoke-auth`.
- El frontend de produccion ya prioriza el Kanban como vista principal y deja los modulos auxiliares en acordeones configurables persistentes.

## Arquitectura objetivo

### Frontend

- React + Vite + TypeScript
- PWA con una unica estrategia de registro de service worker
- almacenamiento local solo para cache funcional y trabajo offline

### Backend

- API para autenticacion, tableros, progreso, asignaciones y compartir
- persistencia relacional para entidades docente, alumno, aula y tablero
- almacenamiento de evidencias y adjuntos con limites y validacion

### Operacion

- CDN o proxy frontal
- observabilidad de frontend y API
- backups y restauracion documentada

## Criterios de aceptacion globales

- `npm run build` verde
- `npm run lint` verde
- compartir funcional entre dispositivos
- progreso por alumno persistente
- experiencia usable en movil y tablet
- mensajes de producto coherentes con el comportamiento real
- despliegue documentado y repetible

## Arranque de ejecucion

Semana 1:

- crear gobierno tecnico en repo
- corregir claims engañosos en UI y documentacion
- atacar errores de lint de mayor riesgo
- fijar el alcance real del modo local frente a la futura sincronizacion

## Estado de ejecucion a 2026-03-21

Roadmap `Pasos Aula / Equipo / Claustro`:

- Fase 1 cerrada con:
  - `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
  - `docs/MATRIZ_ROLES_PERMISOS.md`
  - `docs/JOURNEYS_CRITICOS_PASOS.md`
  - `docs/WIREFRAMES_FASE_1.md`
  - `docs/BACKLOG_P1_P2_P3_PASOS.md`
  - `docs/DECISIONES_FASE_1.md`
- Fase 2 iniciada con scaffold inicial de organizaciones y equipos en backend y selector Pro de contexto en frontend.
- Fase 2 ampliada con:
  - membresias reales de equipo
  - tableros ligados a organizacion/equipo
  - filtrado por espacio activo
  - permisos de solo lectura para roles `viewer`
  - creacion contextual de tableros por tipo de espacio
  - gestion visual de miembros de equipo
  - primera navegacion propia de `Pasos Equipo` con acciones guiadas

Fase 0:

- mensajes de producto y ayuda ya alineados con el comportamiento local real
- vista compartida local corregida para usar el `boardId` referenciado
- `npm run lint` verde
- `npm run build` verde

Fase 1:

- arquitectura real de produccion verificada contra la release activa
- `backend/`, `deploy/`, `scripts/` y documentacion operativa ya consolidados en este repo
- base de `systemd`, `nginx`, healthcheck y smoke scripts disponible para siguiente iteracion

Fase 2:

- variables de entorno, JWT, cookies seguras, rotacion de refresh y restricciones de despliegue ya reflejadas en el baseline importado
- login/registro Pro ya conectados desde frontend a la API real
- selector Pro ampliado con organizaciones, equipos y resumen operativo del espacio activo
- creacion de tableros ya diferencia entre `Pasos Aula`, `Pasos Claustro` y `Pasos Equipo` con presets iniciales
- gestion de miembros de equipo ya operativa en la interfaz para roles con capacidad de coordinacion
- cierre funcional de Fase 2 completado en permisos, contexto organizativo y operativa base de espacios

Fase 3:

- backend base para auth, boards y share codes ya presente en repo
- resolucion de codigos compartidos ya funciona en frontend contra backend Pro
- compartir docente ya publica tableros en backend al generar enlace Pro
- sesion Pro ya se restaura automaticamente al entrar y vuelve a cargar tableros remotos
- los tableros del docente en Pro ya se sincronizan en segundo plano desde frontend
- cierre funcional de Fase 3 completado para auth, compartir y continuidad multi-dispositivo
- `Pasos Aula 2.0` ya incorpora campos pedagogicos en tarea: objetivo, ayuda, evidencia esperada, siguiente paso y estado
- el alumno ya puede abrir detalle, pedir ayuda y registrar evidencia sobre tareas compartidas
- el docente ya puede revisar alumnado, dejar feedback y validar pasos desde la interfaz Pro
- backend ya persiste ayuda, evidencias, validaciones y feedback por alumno en el seguimiento de share codes
- ya existe `vista Hoy` con lectura de asignaciones por fecha objetivo para seguimiento diario
- las secuencias pueden asignarse explicitamente a alumno o grupo con notas y fecha objetivo desde la interfaz Pro
- cierre funcional de Fase 3 completado tambien para asignacion y seguimiento dirigido por alumno

Fase 4:

- `BoardView`, `SharedBoardView`, `BoardToolbar` y `BoardColumn` ya responden mejor en movil y tablet
- se eliminaron flujos fragiles de columnas y creacion de tableros basados en `prompt` y `confirm`
- `TaskModal` ya usa validacion y confirmacion integradas en UI para adjuntos y borrado
- cierre operativo de Fase 4 completado en la experiencia principal de docente y alumno
- `Pasos Equipo` ya incorpora comentarios con menciones, panel de acuerdos pendientes y lectura de incidencias
- los tableros de equipo ya muestran coordinacion semanal con swimlanes, bloqueos, vencimientos y documentos vinculados
- ya existe modo reunion con actas trazables enlazadas a tareas del tablero
- backend ya persiste comentarios, menciones y actas por tablero de equipo
- cierre funcional de Fase 4 completado para coordinacion semanal de equipos docentes
- esquema de produccion migrado hasta `20260321_0008` y verificado con smoke API
- bundle frontend saneado con division por rutas para eliminar el warning del chunk principal
- `deploy/deploy.sh` ya contempla la estructura real del repo mientras no se complete el move a `frontend/`

Fase 5:

- biblioteca de plantillas operativa con plantillas base y plantillas personalizadas del docente
- duplicado de tableros y reutilizacion pedagogica ya integrados en la UI principal
- exportacion de informe pedagogico HTML del tablero activo con secuencia, recursos y seguimiento remoto
- panel docente ampliado con seguimiento de alumnado y actividad reciente desde backend
- panel `Documentos` ya operativo con versionado ligero, estados, enlaces, embebidos y vinculacion a tareas
- ruta `Agenda` ya operativa con vistas mensual/semanal y lectura de vencimientos/asignaciones
- feeds `ICS` personales y de equipo ya disponibles en backend y UI para modo Pro
- cierre funcional de Fase 5 completado para biblioteca, reutilizacion, informe docente, documentos y calendarios

Fase 6:

- telemetria local estructurada persistida y exportable desde la app
- backend registra actividad de tablero y progreso de alumnado por share code
- centro de almacenamiento y observabilidad disponible en UI con limpieza operativa, reset PWA y borrado local
- estrategia de service worker unificada en `vite-plugin-pwa` con registro explicito en frontend
- politica visible de almacenamiento, cookies y caches ya expuesta dentro del producto
- dependencias entre tarjetas ya integradas en el modelo y en la edicion de tarea
- ruta `Timeline/Gantt` ya operativa para lectura temporal del workspace
- backend ya calcula bloqueos, retrasos, hitos en riesgo y capacidad por responsable
- cierre funcional de Fase 6 completado para operacion diaria, trazabilidad y cronograma ejecutivo previo a panel de centro

Fase 7:

- runner de pruebas frontend ya integrado con `Vitest`, `Testing Library` y `vitest-axe`
- pruebas unitarias y de accesibilidad base añadidas para utilidades, biblioteca de plantillas y centro de datos
- smoke E2E con Playwright ya operativo sobre flujos criticos docente/alumno en navegador real local
- bateria backend ampliada para `health`, `shares`, `activity` e `insights` basicos
- checklist de release documentado en `docs/RELEASE_CHECKLIST.md`
- smoke de staging documentado en `scripts/staging_smoke.sh`
- script reproducible `npm run qa:release` disponible para validacion de entrega
- `react-router-dom` actualizado a rama sin vulnerabilidades de runtime segun `npm audit --omit=dev`
- cierre operativo de Fase 7 completado para QA automatizada, hardening inicial y release candidate local verificable
- roadmap `Pasos Aula / Equipo / Claustro` Fase 7 ya cerrado con:
  - ruta `Panel ejecutivo` para lectura transversal del centro
  - filtros por periodo, equipo, proyecto y responsable
  - agregados backend para avance por proyecto, bloqueos recurrentes, documentos pendientes e hitos vencidos
  - exportacion CSV desde la propia interfaz ejecutiva
- ciclo de auditoria interna y prepiloto ya ejecutado con:
  - validacion de produccion, seguridad basica y smoke auth/share
  - simulacion tecnica integral de centro piloto
  - smoke especifico preparado para staging de piloto
  - informe final de evaluacion y decision `go / no-go` documentados
- estado de salida consolidado:
  - `GO` para piloto controlado humano
  - `NO-GO` para despliegue institucional amplio hasta cerrar riesgos residuales de `ICS`, staging, accesibilidad manual y carga
