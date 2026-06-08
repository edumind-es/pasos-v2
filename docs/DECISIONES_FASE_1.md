# Decisiones de Fase 1

Fecha: 2026-03-21
Estado: aprobadas para arranque autonomo

## Glosario

- `organizacion`: centro educativo o entidad operadora
- `equipo`: espacio permanente o temporal dentro de una organizacion
- `espacio`: contexto actual de trabajo del usuario
- `tablero`: contenedor visual de flujo
- `hito`: punto temporal relevante
- `acuerdo`: decision trazable tomada por un equipo
- `validado`: trabajo completado y aceptado por quien revisa
- `bloqueado`: trabajo que no puede avanzar

## Decisiones de producto

- `Pasos` evoluciona como plataforma con tres experiencias: `Aula`, `Equipo`, `Claustro`.
- `boards` sigue siendo el contenedor operativo principal.
- `Timeline/Gantt` es una vista derivada y no reemplaza el tablero.
- `Aula` prioriza foco, claridad y carga cognitiva baja.
- `Equipo` prioriza coordinacion, reunion y trazabilidad.
- `Claustro` prioriza lectura transversal y cronograma.

## Estrategia de migracion

- se reutiliza `boards` como entidad central del flujo
- se reutiliza `board_memberships` como base de membresia de tablero
- se amplian metadatos de `boards` para soportar organizacion, equipo y tipo de contexto
- se introduce `organizations` y `teams` sin romper tableros existentes
- los tableros actuales del modo `Pro` pueden quedar inicialmente en una organizacion por defecto

## Gate de Fase 2

Se puede iniciar Fase 2 si:

- existen los documentos de dominio, permisos, journeys, wireframes, decisiones y backlog
- el modelo propuesto no rompe el backend actual
- hay un `staging` o una estrategia de demo reproducible
- el MVP queda acotado a `organizations`, `teams`, `permissions`, `context switcher` y `team boards`

## Staging y demo

- se usara un entorno `staging` estable para demos quincenales
- el `staging` debe disponer de:
  - URL publica o interna consistente
  - smoke de despliegue
  - datos de demo no reales

## Dataset demo

Se prepararan como minimo:

- una organizacion demo
- un equipo de ciclo
- un equipo directivo
- un tablero de aula
- un tablero de equipo
- un tablero de proyecto de centro

## Metricas iniciales

- usuarios activos por rol
- equipos activos por semana
- tableros creados por contexto
- acuerdos cerrados
- evidencias subidas
- errores de API por modulo
- tiempos de respuesta de endpoints criticos
