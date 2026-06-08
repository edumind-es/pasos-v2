# Matriz de Roles y Permisos

Fecha: 2026-03-21
Estado: baseline Fase 1

## Roles

- `superadmin`
- `organization_admin`
- `leadership`
- `coordinator`
- `teacher`
- `specialist`
- `tutor`
- `family_viewer`
- `student`

## Principios

- minimo privilegio por defecto
- separacion entre datos de alumno y gestion organizativa
- permisos heredados desde organizacion a equipo, y desde equipo a recursos, solo cuando aplique
- los permisos de escritura requieren pertenencia explicita al espacio

## Acciones base

- `view`
- `create`
- `edit`
- `delete`
- `archive`
- `manage_members`
- `comment`
- `share`
- `assign`
- `validate`
- `export`
- `manage_settings`

## Matriz resumida

### Organizacion

| Accion | superadmin | organization_admin | leadership | coordinator | teacher | specialist | tutor | family_viewer | student |
|---|---|---|---|---|---|---|---|---|---|
| ver organizacion | si | si | si | si | si | si | segun membresia | no | no |
| editar ajustes | si | si | no | no | no | no | no | no | no |
| gestionar miembros | si | si | no | no | no | no | no | no | no |
| crear equipos | si | si | si | no | no | no | no | no | no |
| ver panel ejecutivo | si | si | si | segun equipo | no | no | no | no | no |

### Equipo

| Accion | superadmin | organization_admin | leadership | coordinator | teacher | specialist | tutor | family_viewer | student |
|---|---|---|---|---|---|---|---|---|---|
| ver equipo | si | si | si | si | si | si | segun membresia | no | no |
| crear tablero de equipo | si | si | si | si | no | no | no | no | no |
| editar tablero de equipo | si | si | si | si | si si es miembro editor | si si es miembro editor | no | no | no |
| comentar | si | si | si | si | si | si | segun permiso | no | no |
| crear acuerdos | si | si | si | si | si si es miembro editor | si si es miembro editor | no | no | no |
| cerrar acuerdos | si | si | si | si | no | no | no | no | no |
| gestionar miembros del equipo | si | si | si | si si es owner | no | no | no | no | no |

### Aula

| Accion | superadmin | organization_admin | leadership | coordinator | teacher | specialist | tutor | family_viewer | student |
|---|---|---|---|---|---|---|---|---|---|
| ver tablero aula | si | si | segun permiso | si si coordina | si | si | si | si segun asignacion | si si asignado |
| crear secuencia | si | si | no | si | si | si | no | no | no |
| asignar secuencia | si | si | no | si | si | si | no | no | no |
| editar secuencia | si | si | no | si | si | si | no | no | no |
| completar tarea | no | no | no | no | no | no | no | no | si |
| pedir ayuda | no | no | no | no | no | no | no | no | si |
| subir evidencia | no | no | no | no | no | no | no | no | si |
| validar evidencia | si | si | no | si | si | si | no | no | no |
| exportar informe | si | si | si | si | si | si | si segun permiso | no | no |

### Documentos

| Accion | superadmin | organization_admin | leadership | coordinator | teacher | specialist | tutor | family_viewer | student |
|---|---|---|---|---|---|---|---|---|---|
| ver documento | si | si | si | si | si segun espacio | si segun espacio | si segun espacio | no salvo documento compartido | no salvo documento asignado |
| crear documento | si | si | si | si | si segun espacio | si segun espacio | no | no | no |
| editar documento | si | si | si | si | si si es autor/editor | si si es autor/editor | no | no | no |
| publicar documento | si | si | si | si | no | no | no | no | no |

## Privacidad y visibilidad

- los datos de `Aula` nunca aparecen en vistas de `Equipo` o `Claustro` salvo agregados sin identificacion personal o permisos expresos.
- `family_viewer` solo accede a informacion del alumno asociado y nunca a espacios internos de equipo o claustro.
- `student` solo accede a secuencias y evidencias propias o compartidas con su grupo.
- `leadership` y `organization_admin` pueden ver indicadores agregados, pero no el detalle sensible de un alumno sin una razon funcional y permiso explicito.
- los documentos marcados como `internos` no son visibles fuera del equipo o espacio originario.

## Reglas especificas

- un `board` de tipo `team_coordination` solo puede pertenecer a un `team`.
- un `board` de tipo `learning_sequence` solo puede asignarse a `Aula`.
- `share codes` anonimos no se usan para espacios de `Equipo` ni `Claustro`.
- `Timeline/Gantt` solo muestra elementos a los que el usuario ya tenga acceso en origen.

## Gate para backend

Antes de desarrollar Fase 2, estos contratos deben trasladarse a:

- enums de roles
- servicios de autorizacion
- filtros de consulta
- DTOs con omision de datos segun rol
