# Backlog Operativo Fase 1

Fecha: 2026-03-21
Estado: listo para ejecucion
Horizonte: 2 semanas

## Objetivo

Convertir la investigacion y el roadmap de `Pasos Aula`, `Pasos Equipo` y `Pasos Claustro` en una especificacion funcional y tecnica cerrada para arrancar la construccion de Fase 2 sin ambiguedades.

## Definition of Done de Fase 1

La fase se considera cerrada solo si existen y quedan revisados los siguientes artefactos:

- `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
- `docs/MATRIZ_ROLES_PERMISOS.md`
- `docs/JOURNEYS_CRITICOS_PASOS.md`
- `docs/WIREFRAMES_FASE_1.md`
- `docs/BACKLOG_P1_P2_P3_PASOS.md`
- `docs/DECISIONES_FASE_1.md`

Ademas:

- el modelo de dominio queda alineado con `backend/app/models`
- la arquitectura objetivo queda alineada con `docs/ARCHITECTURE.md`
- existe criterio claro para arrancar Fase 2

## Alcance cerrado

Incluido en Fase 1:

- definicion de modulos
- definicion de roles
- definicion de permisos
- journeys criticos
- inventario de entidades
- backlog priorizado
- wireframes de alta prioridad
- decisiones tecnicas de dominio

No incluido en Fase 1:

- desarrollo funcional completo de organizaciones y equipos
- nueva API productiva
- migraciones masivas
- integraciones con calendarios o documentos externos
- implementacion de Gantt

## Bloques de trabajo

### EP01. Mapa de producto y contextos

- [ ] `F1-001` Definir los contextos funcionales `Core`, `Aula`, `Equipo`, `Claustro`, `Docs`, `Calendar`, `Timeline`.
  - Perfil: Product Lead + Backend Senior
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
  - Aceptacion: cada contexto tiene objetivo, entidades, fronteras y dependencias.

- [ ] `F1-002` Decidir que capacidades permanecen comunes y cuales divergen por experiencia.
  - Perfil: Frontend Senior + UX
  - Prioridad: P1
  - Estimacion: S
  - Dependencia: `F1-001`
  - Salida: seccion `capacidades comunes` dentro de `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
  - Aceptacion: quedan definidos componentes compartidos y vistas especificas por modulo.

- [ ] `F1-003` Definir lenguaje comun del producto.
  - Perfil: UX + Product Lead
  - Prioridad: P1
  - Estimacion: S
  - Salida: glosario en `docs/DECISIONES_FASE_1.md`
  - Aceptacion: terminos como `equipo`, `espacio`, `tablero`, `hito`, `acuerdo`, `validado`, `bloqueado` tienen definicion unica.

### EP02. Roles y permisos

- [ ] `F1-010` Inventariar roles objetivo del sistema.
  - Perfil: Backend Senior + UX
  - Prioridad: P1
  - Estimacion: S
  - Salida: `docs/MATRIZ_ROLES_PERMISOS.md`
  - Aceptacion: aparecen como minimo `superadmin`, `admin centro`, `directivo`, `coordinador`, `docente`, `especialista`, `tutor`, `familia`, `alumno`.

- [ ] `F1-011` Definir permisos por modulo y accion.
  - Perfil: Backend Senior
  - Prioridad: P1
  - Estimacion: M
  - Dependencia: `F1-010`
  - Salida: `docs/MATRIZ_ROLES_PERMISOS.md`
  - Aceptacion: se cubren crear, leer, editar, validar, compartir, archivar, comentar, exportar y administrar.

- [ ] `F1-012` Definir reglas de privacidad para datos pedagogicos y organizativos.
  - Perfil: Backend Senior + UX + DevOps
  - Prioridad: P1
  - Estimacion: M
  - Dependencia: `F1-011`
  - Salida: seccion `privacidad y visibilidad` en `docs/MATRIZ_ROLES_PERMISOS.md`
  - Aceptacion: queda claro que datos de alumnado, equipo y claustro no se mezclan por defecto.

### EP03. Journeys criticos

- [ ] `F1-020` Documentar journey de docente en `Pasos Aula`.
  - Perfil: UX + Frontend Senior
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/JOURNEYS_CRITICOS_PASOS.md`
  - Aceptacion: incluye crear secuencia, asignar, revisar evidencia, validar y exportar.

- [ ] `F1-021` Documentar journey de alumno.
  - Perfil: UX
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/JOURNEYS_CRITICOS_PASOS.md`
  - Aceptacion: incluye entrar, ver `Hoy`, pedir ayuda, completar y adjuntar evidencia.

- [ ] `F1-022` Documentar journey de coordinador o equipo.
  - Perfil: UX + Product Lead
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/JOURNEYS_CRITICOS_PASOS.md`
  - Aceptacion: incluye reunion, acuerdos, documentos y seguimiento.

- [ ] `F1-023` Documentar journey de equipo directivo.
  - Perfil: UX + Product Lead
  - Prioridad: P2
  - Estimacion: S
  - Salida: `docs/JOURNEYS_CRITICOS_PASOS.md`
  - Aceptacion: incluye lectura de panel ejecutivo, hitos, bloqueos y cronograma.

### EP04. Modelo de dominio y datos

- [ ] `F1-030` Inventariar entidades nuevas sobre el backend actual.
  - Perfil: Backend Senior
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
  - Aceptacion: se diferencian entidades actuales, extensiones y entidades nuevas.

- [ ] `F1-031` Definir el modelo inicial de organizaciones y equipos.
  - Perfil: Backend Senior
  - Prioridad: P1
  - Estimacion: M
  - Dependencia: `F1-030`
  - Salida: seccion `modelo de datos fase 2` en `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
  - Aceptacion: incluye `organizations`, `teams`, `team_memberships`, `organization_memberships`.

- [ ] `F1-032` Definir el modelo de objetos documentales y agenda.
  - Perfil: Backend Senior + DevOps
  - Prioridad: P2
  - Estimacion: M
  - Dependencia: `F1-030`
  - Salida: seccion `documentos y calendario` en `docs/DOMINIO_PASOS_AULA_CLAUSTRO.md`
  - Aceptacion: incluye `documents`, `attachments`, `calendar_feeds`, `milestones`, `dependencies`.

- [ ] `F1-033` Definir estrategia de migracion desde `boards` y `board_memberships`.
  - Perfil: Backend Senior
  - Prioridad: P1
  - Estimacion: S
  - Dependencia: `F1-031`
  - Salida: seccion `estrategia de migracion` en `docs/DECISIONES_FASE_1.md`
  - Aceptacion: se explicita que se reutiliza, que se depreca y que se migra.

### EP05. UX/UI y wireframes

- [ ] `F1-040` Definir la tarjeta educativa avanzada de `Pasos Aula`.
  - Perfil: UX + Frontend Senior
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/WIREFRAMES_FASE_1.md`
  - Aceptacion: la tarjeta incluye objetivo, evidencia, ayuda, tiempo estimado, siguiente paso y estado.

- [ ] `F1-041` Definir el layout de cambio de contexto `Aula / Equipo / Claustro`.
  - Perfil: UX + Frontend Senior
  - Prioridad: P1
  - Estimacion: M
  - Salida: `docs/WIREFRAMES_FASE_1.md`
  - Aceptacion: el usuario entiende siempre en que espacio trabaja.

- [ ] `F1-042` Definir wireframe de `modo reunion`.
  - Perfil: UX
  - Prioridad: P2
  - Estimacion: S
  - Salida: `docs/WIREFRAMES_FASE_1.md`
  - Aceptacion: la reunion se puede proyectar y seguir sin ruido visual.

- [ ] `F1-043` Definir wireframe de `Timeline/Gantt`.
  - Perfil: UX + Frontend Senior
  - Prioridad: P2
  - Estimacion: S
  - Salida: `docs/WIREFRAMES_FASE_1.md`
  - Aceptacion: la vista se plantea como derivada del tablero y no como pantalla principal.

### EP06. Backlog priorizado de construccion

- [ ] `F1-050` Crear backlog `P1/P2/P3` para Fases 2-8.
  - Perfil: Product Lead + Senior Team
  - Prioridad: P1
  - Estimacion: M
  - Dependencia: `F1-001`, `F1-011`, `F1-020`, `F1-030`, `F1-040`
  - Salida: `docs/BACKLOG_P1_P2_P3_PASOS.md`
  - Aceptacion: cada item tiene valor, dependencia y criterio de exito.

- [ ] `F1-051` Definir MVP comercializable.
  - Perfil: Product Lead + Backend Senior + Frontend Senior
  - Prioridad: P1
  - Estimacion: S
  - Dependencia: `F1-050`
  - Salida: seccion `MVP` en `docs/BACKLOG_P1_P2_P3_PASOS.md`
  - Aceptacion: queda claro que entra en `v1`, `v1.5` y `v2`.

- [ ] `F1-052` Definir criterio de entrada y salida para Fase 2.
  - Perfil: Product Lead + Senior Team
  - Prioridad: P1
  - Estimacion: S
  - Dependencia: `F1-050`
  - Salida: seccion `gate de fase 2` en `docs/DECISIONES_FASE_1.md`
  - Aceptacion: nadie entra a desarrollar organizaciones/equipos sin contrato funcional cerrado.

### EP07. DevOps y entorno de validacion

- [ ] `F1-060` Preparar `staging` para demos quincenales.
  - Perfil: DevOps
  - Prioridad: P1
  - Estimacion: M
  - Salida: nota operativa en `docs/DECISIONES_FASE_1.md`
  - Aceptacion: existe URL, smoke y juego de datos de demo.

- [ ] `F1-061` Definir datos de demo para `Aula`, `Equipo` y `Claustro`.
  - Perfil: Frontend Senior + DevOps
  - Prioridad: P2
  - Estimacion: S
  - Dependencia: `F1-020`, `F1-022`
  - Salida: seccion `dataset demo` en `docs/DECISIONES_FASE_1.md`
  - Aceptacion: las demos muestran valor pedagogico y organizativo sin exponer datos reales.

- [ ] `F1-062` Definir metricas minimas por modulo.
  - Perfil: DevOps + Backend Senior
  - Prioridad: P2
  - Estimacion: S
  - Salida: seccion `metricas iniciales` en `docs/DECISIONES_FASE_1.md`
  - Aceptacion: se concretan metricas para adopcion, errores y uso por rol.

## Plan de ejecucion por sprint

## Sprint 1

Objetivo:

- cerrar contexto, roles y journeys

Items comprometidos:

- `F1-001`
- `F1-002`
- `F1-003`
- `F1-010`
- `F1-011`
- `F1-020`
- `F1-021`
- `F1-022`
- `F1-030`

Resultado esperado:

- arquitectura funcional entendible por todo el equipo
- matriz inicial de permisos
- journeys base cerrados

## Sprint 2

Objetivo:

- cerrar wireframes, decisiones y backlog de construccion

Items comprometidos:

- `F1-012`
- `F1-023`
- `F1-031`
- `F1-032`
- `F1-033`
- `F1-040`
- `F1-041`
- `F1-042`
- `F1-043`
- `F1-050`
- `F1-051`
- `F1-052`
- `F1-060`
- `F1-061`
- `F1-062`

Resultado esperado:

- lista cerrada para arrancar Fase 2
- MVP y versionado definidos
- staging listo para demos

## Dependencias criticas

- no cerrar permisos sin journeys.
- no cerrar wireframes sin contexto y roles.
- no congelar modelo de datos sin estrategia de migracion.
- no abrir Fase 2 hasta que `F1-052` este aprobado.

## Riesgos operativos

- mezclar demasiado pronto `Aula` y `Claustro` en la misma UX
- inflar el MVP con documentos complejos y Gantt antes de tiempo
- definir permisos tarde y bloquear backend
- diseñar wireframes sin pensar en e-ink, movil y reunion

## Primer paquete de trabajo recomendado

Si se empieza hoy, el primer bloque a ejecutar es:

- `F1-001`
- `F1-010`
- `F1-020`
- `F1-030`

Ese bloque nos da el esqueleto de dominio, permisos, journeys y entidades para que el resto no se construya sobre supuestos.
