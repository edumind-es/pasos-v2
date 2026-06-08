# Dominio Pasos Aula, Equipo y Claustro

Fecha: 2026-03-21
Estado: aprobado para arranque de Fase 2

## Objetivo

Definir el dominio funcional y tecnico de `Pasos` como plataforma con tres experiencias conectadas:

- `Pasos Aula`
- `Pasos Equipo`
- `Pasos Claustro`

## Contextos funcionales

## Core

Responsabilidad:

- identidad
- permisos
- organizaciones
- equipos
- membresias
- actividad
- notificaciones futuras

Entidades:

- `users`
- `organizations`
- `organization_memberships`
- `teams`
- `team_memberships`
- `activities`

## Aula

Responsabilidad:

- secuencias de aprendizaje
- tableros pedagogicos
- progreso
- evidencias
- feedback
- validacion docente

Entidades:

- `boards`
- `board_memberships`
- `board_shares`
- `share_learner_progress`
- `board_activity_events`
- `learning_assignments`
- `learning_feedback`
- `learning_evidences`

## Equipo

Responsabilidad:

- coordinacion docente
- acuerdos
- reuniones
- tareas compartidas
- seguimiento de responsables

Entidades:

- `team_boards`
- `team_meetings`
- `team_agreements`
- `team_comments`

## Claustro

Responsabilidad:

- gestion de proyectos de centro
- seguimiento transversal
- hitos
- dependencias
- panel ejecutivo

Entidades:

- `organization_projects`
- `milestones`
- `dependencies`
- `organization_insights`

## Docs

Responsabilidad:

- documentos vivos
- adjuntos
- recursos embebibles
- versionado ligero

Entidades:

- `documents`
- `document_versions`
- `attachments`
- `resource_links`

## Calendar

Responsabilidad:

- agenda personal
- agenda de equipo
- agenda de centro
- feeds exportables

Entidades:

- `calendar_feeds`
- `calendar_subscriptions`
- `calendar_events`

## Timeline

Responsabilidad:

- cronograma derivado
- dependencias
- hitos
- lectura ejecutiva

Entidades:

- `milestones`
- `dependencies`
- `timeline_snapshots` opcional futuro

## Capacidades comunes

Compartidas por `Aula`, `Equipo` y `Claustro`:

- tablero y tarjetas
- comentarios
- actividad
- permisos
- adjuntos
- etiquetas
- fechas
- responsables
- estado

Especificas por experiencia:

- `Aula`: evidencia, ayuda, validacion, alumno, familia
- `Equipo`: acuerdos, actas, reunion, coordinacion
- `Claustro`: dependencia, hito, cronograma, lectura ejecutiva

## Fronteras de contexto

- `Core` nunca contiene logica pedagogica.
- `Aula` no debe depender del panel ejecutivo de `Claustro`.
- `Equipo` y `Claustro` comparten objetos organizativos, pero no exponen datos sensibles de alumnado por defecto.
- `Docs`, `Calendar` y `Timeline` funcionan como modulos transversales consumidos por los tres espacios.

## Modelo actual reutilizable

El backend ya dispone de:

- `users`
- `boards`
- `board_memberships`
- `board_shares`
- `share_learner_progress`
- `board_activity_events`
- `refresh_tokens`

Estas entidades se reutilizan como base para:

- identidad
- tableros
- compartir
- actividad
- progreso de alumnado

## Extensiones necesarias sobre el modelo actual

Se extienden las tablas actuales con metadatos de contexto:

- `boards`
  - añadir `organization_id` nullable
  - añadir `team_id` nullable
  - añadir `context_type`
  - añadir `board_type`
- `board_memberships`
  - ampliar roles para experiencias organizativas
- `board_activity_events`
  - incluir referencia opcional a `organization_id` y `team_id`

## Nuevas entidades de Fase 2

### organizations

- `id`
- `name`
- `slug`
- `plan_type`
- `is_active`
- `metadata`

### organization_memberships

- `id`
- `organization_id`
- `user_id`
- `role`
- `status`

### teams

- `id`
- `organization_id`
- `name`
- `slug`
- `team_type`
- `visibility`
- `is_archived`
- `metadata`

### team_memberships

- `id`
- `team_id`
- `user_id`
- `role`
- `status`

## Nuevas entidades previstas para Fase 3-6

### learning_assignments

- asignacion de un tablero o secuencia a alumnos o grupos

### learning_evidences

- evidencias del alumno o docente

### learning_feedback

- devolucion formativa

### documents

- documento vivo asociado a espacio, equipo o tablero

### attachments

- archivo o recurso asociado a documento o tarjeta

### milestones

- hitos de proyecto o proceso

### dependencies

- relacion origen-destino entre tarjetas o hitos

### team_meetings

- reuniones y seguimiento

### team_agreements

- acuerdos trazables

## Relaciones clave

- un `user` puede pertenecer a varias `organizations`
- una `organization` contiene varios `teams`
- un `team` contiene varios `boards`
- un `board` puede pertenecer a `Aula`, `Equipo` o `Claustro`
- un `document` puede colgar de `organization`, `team`, `board` o `card`
- un `milestone` puede asociarse a `team`, `project` o `board`

## Tipos de tablero

- `learning_sequence`
- `learning_routine`
- `student_plan`
- `team_coordination`
- `department_project`
- `organization_project`
- `meeting_followup`

## Tipos de tarjeta

- `task`
- `learning_step`
- `evidence`
- `agreement`
- `document`
- `resource`
- `incident`
- `milestone`

## Politicas base de dominio

- `Aula` separa `hecho` de `validado`
- `Equipo` separa `propuesto` de `acordado`
- `Claustro` separa `planificado` de `ejecutado`
- `Timeline/Gantt` se deriva de tarjetas con fechas y dependencias
- los datos de alumno no son visibles en contextos organizativos salvo permiso expreso

## Estrategia de evolucion tecnica

### Fase 2

- introducir `organizations` y `teams`
- mantener `boards` como contenedor principal
- evitar refactor destructivo del store y DTOs

### Fase 3

- enriquecer `snapshot` del tablero con campos pedagogicos nuevos
- mantener compatibilidad con tableros existentes

### Fase 4-6

- crear objetos nuevos desacoplados:
  - documentos
  - calendario
  - dependencias
  - hitos

## Criterio de diseño

- evolucion incremental
- compatibilidad con el modelo actual
- evitar reescrituras masivas del tablero existente
- encapsular nuevas capacidades en API y servicios antes que en lógica duplicada de frontend
