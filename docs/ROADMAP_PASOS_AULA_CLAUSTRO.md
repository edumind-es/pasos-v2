# Roadmap Pasos Aula, Equipo y Claustro

Fecha: 2026-03-21

## Punto de partida

El repositorio ya tiene una base funcional cerrada en las fases 0-7 del producto actual:

- frontend y backend estabilizados
- modo `Express` y modo `Pro`
- compartir remoto
- progreso de alumnado
- biblioteca de plantillas
- exportaciones
- telemetria y almacenamiento
- QA automatizada con `Vitest`, `Playwright` y `pytest`

Este roadmap no sustituye ese trabajo. Lo extiende para llevar `Pasos` a una plataforma completa con tres capas:

- `Pasos Aula`
- `Pasos Equipo`
- `Pasos Claustro`

## Vision del producto

### Pasos Aula

Sistema de flujo pedagogico para alumnado, docente y familias, con tablero visual, secuencias, evidencias, feedback y seguimiento.

### Pasos Equipo

Sistema de coordinacion de equipos docentes y grupos de trabajo, con tableros compartidos, documentos, acuerdos y calendario.

### Pasos Claustro

Sistema de gestion visual organizativa para centro educativo, con equipos, proyectos, cronogramas, documentos, dependencias y panel ejecutivo.

## Objetivo de entrega llave en mano

Entregar una version desplegable y usable por un centro educativo real con:

- gestion multi-equipo
- permisos y trazabilidad
- flujos pedagogicos y organizativos diferenciados
- recursos embebibles
- calendarios personales y de equipo
- seguimiento documental
- vista `Timeline/Gantt`
- piloto real y release candidata estable

## Horizonte recomendado

- duracion total: 24 semanas
- cadencia: sprints de 2 semanas
- releases: una release interna por sprint y una release demostrable cada 2 sprints

## Equipo funcional

- frontend senior
- backend senior
- devops parcial
- ux/accesibilidad parcial
- product lead

## Roles objetivo del sistema

- superadmin plataforma
- admin de centro
- equipo directivo
- coordinador de etapa o departamento
- docente
- especialista u orientacion
- tutor
- familia observadora
- alumno

## Ejes de trabajo

- experiencia pedagogica
- modelo organizacional
- permisos y seguridad
- documentos y recursos
- calendarios y cronograma
- observabilidad y operacion

## Fase 1. Descubrimiento funcional y arquitectura de dominio

Duracion: semanas 1-2

Objetivo:

- convertir la investigacion en especificacion funcional y modelo de dominio

Entregables:

- mapa de modulos `Aula`, `Equipo` y `Claustro`
- mapa de roles y permisos
- inventario de entidades
- journeys criticos por rol
- backlog priorizado `P1/P2/P3`
- wireframes de alta prioridad

Trabajo frontend:

- definir informacion visible por tarjeta y por vista
- prototipos de `Board`, `Calendar`, `Docs`, `Timeline`

Trabajo backend:

- definir entidades:
  - `organizations`
  - `teams`
  - `team_memberships`
  - `documents`
  - `milestones`
  - `dependencies`
  - `calendar_feeds`
  - `activities`
- definir estrategia de migracion desde el modelo actual

Trabajo UX/accesibilidad:

- journeys de:
  - docente
  - coordinador
  - equipo directivo
  - alumno
- decision sobre nomenclatura de estados pedagogicos y organizativos

Trabajo DevOps:

- preparar `staging` para demos quincenales
- definir metricas minimas por modulo

Criterio de salida:

- especificacion funcional aprobada
- modelo de datos versionado
- prioridades cerradas para las fases 2-4

Backlog operativo:

- `docs/BACKLOG_FASE_1_AULA_CLAUSTRO.md`

## Fase 2. Nucleo de organizacion, equipos y permisos

Duracion: semanas 3-6

Objetivo:

- crear la columna vertebral multi-centro y multi-equipo

Entregables:

- organizaciones
- equipos permanentes y temporales
- invitaciones y membresias
- permisos por rol
- tableros por espacio
- actividad y auditoria basica

Trabajo frontend:

- selector de organizacion y equipo
- navegacion por espacios
- gestion de miembros
- filtros por responsable y equipo

Trabajo backend:

- API de organizaciones y equipos
- memberships y roles
- auditoria de acciones
- paginacion y permisos

Trabajo UX/accesibilidad:

- diseño claro de cambio de contexto `mi aula / mi equipo / centro`
- accesibilidad de gestion de miembros y permisos

Trabajo DevOps:

- seeds para centros de prueba
- backup y restauracion con nuevas entidades

Dependencias:

- cierre de fase 1

Criterio de salida:

- un centro puede crear equipos y asignar responsables
- cada usuario solo ve lo que le corresponde
- existe trazabilidad de cambios clave

## Fase 3. Pasos Aula 2.0

Duracion: semanas 7-10

Objetivo:

- convertir el tablero actual en flujo pedagogico completo

Entregables:

- estados pedagogicos
- tarjeta educativa avanzada
- evidencias
- feedback docente
- vista `Hoy`
- vista de progreso por alumno
- plantillas pedagogicas mejoradas

Trabajo frontend:

- nueva tarjeta con:
  - objetivo
  - evidencia esperada
  - ayuda o apoyo
  - tiempo estimado
  - siguiente paso
- vista `Hoy`
- vista `Necesito ayuda`
- panel de feedback

Trabajo backend:

- persistencia de evidencias y feedback
- historial de validacion
- agregados de progreso por alumno y grupo

Trabajo UX/accesibilidad:

- simplificacion de carga cognitiva
- iconografia y lectura facil
- variante fuerte para infantil, inclusion y e-ink

Trabajo DevOps:

- almacenamiento de adjuntos con limites y limpieza

Criterio de salida:

- un docente puede asignar una secuencia
- el alumno puede avanzar, pedir ayuda y adjuntar evidencia
- el docente puede revisar y validar

## Fase 4. Pasos Equipo

Duracion: semanas 11-14

Objetivo:

- habilitar coordinacion docente real entre miembros de un equipo

Entregables:

- tableros de equipo
- acuerdos y actas
- comentarios y menciones
- documentos vinculados
- reuniones con modo seguimiento
- dashboard de bloqueos y vencimientos

Trabajo frontend:

- tablero de equipo con swimlanes
- modo reunion
- panel de actividad
- vista de acuerdos pendientes

Trabajo backend:

- comentarios
- menciones
- actas
- tipos de tarjeta:
  - tarea
  - acuerdo
  - documento
  - incidencia
  - hito

Trabajo UX/accesibilidad:

- vista de reunion proyectable
- filtros persistentes
- flujos de comentario y lectura comodos

Trabajo DevOps:

- logs estructurados por equipo y accion

Criterio de salida:

- un departamento o ciclo puede coordinar su trabajo semanal en `Pasos`
- las reuniones dejan acuerdos trazables

## Fase 5. Documentos, embebidos y calendarios

Duracion: semanas 15-18

Objetivo:

- unir el flujo Kanban con recursos y agenda real del centro

Entregables:

- documentos con estados
- vista previa de embebidos
- adjuntos y enlaces
- feeds `ICS`
- calendario personal
- calendario de equipo

Trabajo frontend:

- panel `Documentos`
- preview de:
  - PDF
  - imagen
  - audio
  - video
  - enlace
- calendario mensual y semanal

Trabajo backend:

- versionado ligero de documentos
- metadatos de archivos
- generacion de feeds `ICS`
- permisos por documento

Trabajo UX/accesibilidad:

- lectura clara de documentos y adjuntos
- jerarquia visual entre tarea, recurso y documento vivo

Trabajo DevOps:

- antivirus o inspeccion minima de uploads
- politicas de retencion y cuota

Criterio de salida:

- una tarjeta puede centralizar recursos y documentos
- usuarios pueden suscribirse a su agenda personal o de equipo

## Fase 6. Timeline, dependencias y Gantt

Duracion: semanas 19-20

Objetivo:

- dar visibilidad temporal y ejecutiva a procesos largos

Entregables:

- dependencias entre tarjetas
- hitos
- timeline por equipo
- Gantt por proyecto o centro
- vista de capacidad y retrasos

Trabajo frontend:

- `Timeline` horizontal
- `Gantt` filtrable
- panel de hitos en riesgo

Trabajo backend:

- modelo de dependencias
- calculo de fechas derivadas
- alertas de retraso y bloqueo

Trabajo UX/accesibilidad:

- lectura clara en desktop y reunion
- no saturar movil con timeline complejo

Trabajo DevOps:

- jobs o tareas programadas para recalculo si hiciera falta

Criterio de salida:

- un equipo directivo puede ver cronogramas sin abandonar el sistema
- el Kanban sigue siendo la vista operativa principal

## Fase 7. Panel ejecutivo, insights y seguimiento de centro

Duracion: semanas 21-22

Objetivo:

- ofrecer lectura transversal del estado del centro

Entregables:

- panel de centro
- indicadores por equipo
- bloqueos recurrentes
- documentos pendientes
- hitos vencidos
- avance por proyecto

Trabajo frontend:

- dashboard ejecutivo
- filtros por periodo, equipo, proyecto y responsable

Trabajo backend:

- agregados y consultas de insights
- exportacion CSV o informe

Trabajo UX/accesibilidad:

- simplificar visualizacion para direccion y coordinacion

Trabajo DevOps:

- paneles operativos y alertas de negocio

Criterio de salida:

- direccion puede detectar cuellos de botella y retrasos sin revisar cada tablero

## Fase 8. Piloto real, hardening y despliegue llave en mano

Duracion: semanas 23-24

Objetivo:

- validar el sistema en un centro real y dejarlo listo para adopcion

Entregables:

- piloto con 1-2 centros
- migraciones finales
- performance tuning
- hardening de seguridad
- documentacion funcional
- onboarding por rol
- checklist de release final

Trabajo frontend:

- pulido de UX
- mensajes de ayuda
- tutoriales in-app

Trabajo backend:

- afinado de rendimiento y permisos
- cierre de deuda de API

Trabajo UX/accesibilidad:

- pruebas con usuarios reales
- correcciones de comprension y carga cognitiva

Trabajo DevOps:

- despliegue automatizado
- runbooks
- soporte de incidencias

Criterio de salida:

- el centro puede operar una semana completa en `Pasos`
- no aparecen bloqueos criticos en aula, equipo o claustro

## MVP recomendado

Si hubiera que recortar para una primera comercializacion, el `MVP` deberia incluir:

- organizaciones y equipos
- permisos por rol
- `Pasos Aula 2.0`
- `Pasos Equipo`
- comentarios, acuerdos y documentos basicos
- calendario `ICS`
- dashboard basico

El `Gantt` puede quedar en `v2` si el tiempo aprieta, siempre que ya exista modelo de fechas y dependencias.

## Backlog priorizado

### P1

- organizaciones
- equipos
- roles y permisos
- tarjeta educativa avanzada
- feedback y evidencias
- comentarios
- acuerdos
- documentos basicos
- `ICS`

### P2

- timeline
- dependencias
- Gantt
- panel ejecutivo
- integraciones externas

### P3

- sincronizacion bidireccional con calendarios
- automatizaciones
- recomendaciones inteligentes
- analitica avanzada de adopcion

## Dependencias criticas

- no abrir `Claustro` sin cerrar antes permisos y trazabilidad
- no abrir embebidos y documentos sin politica de almacenamiento
- no abrir `Gantt` sin fechas y dependencias consistentes
- no pilotar con centros sin onboarding y soporte

## KPIs de validacion

- porcentaje de equipos activos por semana
- tiempo medio de cierre de acuerdos
- numero de tareas bloqueadas por equipo
- porcentaje de tarjetas con evidencia o documento
- porcentaje de usuarios que usan calendario
- tasa de adopcion por rol
- errores criticos por sprint
- satisfaccion docente y directiva

## Riesgos principales

- querer construir demasiado a la vez
- mezclar UX de alumno y UX organizativa en una sola vista
- sobredimensionar el Gantt
- no definir bien permisos sobre documentos y datos sensibles
- no pilotar con centro real antes de generalizar

## Recomendacion de ejecucion

- cerrar primero `Fase 1` y `Fase 2` con mucha disciplina
- despues construir `Pasos Aula 2.0` y `Pasos Equipo`
- incorporar documentos y calendario antes que Gantt
- usar el piloto como criterio de verdad para priorizar el resto

## Resultado esperado al final del roadmap

`Pasos` queda convertido en una plataforma educativa visual con:

- capa de aprendizaje
- capa de coordinacion docente
- capa de gestion organizativa
- cronograma y seguimiento transversal
- operacion desplegable y mantenible
