# Piloto Controlado de Centro

Fecha: 2026-03-22

## Estado

### Piloto tecnico

Ejecutado.

Artefactos generados:

- `.build/audit/pilot-simulation-20260322_121937/pilot_simulation_report.json`
- `.build/audit/pilot-simulation-20260322_121937/executive_dashboard.json`
- `.build/audit/pilot-simulation-20260322_121937/executive_dashboard.csv`

Resultado del piloto tecnico:

- `health`: `200`
- `register`: `200`
- `organization`: `201`
- `team`: `201`
- `board`: `201`
- `assignment`: `201`
- `document`: `201`
- `share`: `200`
- `activity`: `200`
- `insights`: `200`
- `executive`: `200`
- `executive_csv`: `200`

Resumen ejecutivo generado en la simulacion:

- `total_boards`: `1`
- `total_tasks`: `3`
- `blocked_count`: `2`
- `delayed_count`: `2`
- `overdue_milestone_count`: `1`
- `pending_document_count`: `1`
- `learner_count`: `1`
- `recent_events`: `2`

Notas del escenario tecnico:

- el flujo ejecutivo se simulo con un tablero de equipo dentro de una organizacion
- el flujo de aprendizaje compartido se simulo sobre un tablero personal Pro
- esta separacion es intencional porque los tableros de `Equipo` y `Claustro` ya no aceptan comparticion anonima

### Piloto humano

No ejecutado en esta fase.

Motivo:

- no hay centro participante ni entorno `staging` aislado confirmado dentro de esta sesion

## Preparacion dejada lista

Scripts:

- `python3 scripts/pilot_simulation_report.py`
- `PILOT_ALLOW_WRITE=1 ./scripts/pilot_center_smoke.sh <base-url>`

## Recomendacion de piloto humano real

Duracion:

- 2 semanas

Participantes minimos:

- 1 miembro de direccion
- 1 coordinador/a
- 2 docentes
- 1 grupo de alumnado

Casos de uso obligatorios:

- crear organizacion y equipo
- crear tablero de claustro
- asignar una secuencia de aula
- registrar evidencia y ayuda
- revisar documentos pendientes
- consultar panel ejecutivo y exportar CSV

Metricas a recoger:

- tiempo de alta de centro y equipo
- tiempo de creacion de tablero
- numero de bloqueos detectados por el panel ejecutivo
- numero de incidencias operativas
- percepcion de claridad por rol
- tareas no completadas por friccion de UX

## Criterio de salida del piloto humano

- sin incidencias P0
- sin perdida de datos
- uso autonomo de direccion y coordinacion
- comprension del panel ejecutivo sin soporte tecnico continuo
- backlog postpiloto priorizado
