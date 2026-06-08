# Wireframes Fase 1

Fecha: 2026-03-21
Estado: baseline funcional

## 1. Cambio de contexto

Objetivo:

- que el usuario entienda siempre si trabaja en `Aula`, `Equipo` o `Claustro`

Wireframe textual:

```text
+--------------------------------------------------------------+
| Logo Pasos | Aula / Equipo / Claustro | Busqueda | Perfil    |
+--------------------------------------------------------------+
| Espacio actual: 2A Primaria > Rutina manana                 |
| [Cambiar espacio] [Favoritos] [Recientes]                   |
+--------------------------------------------------------------+
| Sidebar contextual | Contenido principal                    |
| - Tablero          |                                        |
| - Progreso         |                                        |
| - Docs             |                                        |
| - Calendario       |                                        |
+--------------------------------------------------------------+
```

Decision:

- el cambio de espacio vive en cabecera superior y breadcrumb
- los modulos visibles cambian por contexto y permiso

## 2. Tarjeta educativa avanzada

Objetivo:

- hacer visible no solo la tarea, sino su intencion pedagogica

Wireframe textual:

```text
+---------------------------------------------------+
| Estado | Prioridad | Tiempo estimado | Ayuda      |
| Titulo de la tarea                                |
| Objetivo: ...                                     |
| Evidencia esperada: ...                           |
| Recurso / apoyo: ...                              |
| Siguiente paso: ...                               |
| [Adjuntar evidencia] [Necesito ayuda] [Completar] |
+---------------------------------------------------+
```

Campos minimos:

- titulo
- objetivo
- evidencia esperada
- ayuda o apoyo
- tiempo estimado
- siguiente paso
- estado pedagogico

## 3. Vista Hoy

Objetivo:

- reducir carga cognitiva del alumno

Wireframe textual:

```text
+------------------------------------------------------------+
| Hoy                                                        |
+------------------------------------------------------------+
| 1. Siguiente paso recomendado                              |
| 2. Tareas en marcha                                        |
| 3. Necesitan ayuda                                         |
| 4. Validadas recientemente                                 |
+------------------------------------------------------------+
```

Decision:

- `Hoy` es vista derivada y prioritaria para alumnado

## 4. Modo reunion

Objetivo:

- seguir acuerdos en pantalla grande sin ruido visual

Wireframe textual:

```text
+------------------------------------------------------------+
| Equipo de ciclo | Reunion semanal | Fecha | Moderador      |
+------------------------------------------------------------+
| Pendiente | En curso | Acordado | Bloqueado               |
+------------------------------------------------------------+
| Tarjetas grandes, tipografia amplia, responsables visibles |
+------------------------------------------------------------+
| Resumen: acuerdos cerrados / proximos hitos                |
+------------------------------------------------------------+
```

Decision:

- reducir chrome
- priorizar legibilidad y acciones rapidas

## 5. Timeline/Gantt

Objetivo:

- leer secuencia temporal sin convertirla en vista principal

Wireframe textual:

```text
+----------------------------------------------------------------+
| Filtros: equipo | proyecto | responsable | periodo             |
+----------------------------------------------------------------+
| Hito A     |====|                                               |
| Tarea B        |------|                                         |
| Tarea C             |---|                                       |
| Dependencia B -> C                                              |
+----------------------------------------------------------------+
```

Decision:

- el timeline parte de tarjetas con fechas y dependencias
- el detalle sigue viviendo en el tablero o la tarjeta

## 6. Panel ejecutivo

Objetivo:

- lectura transversal para direccion

Wireframe textual:

```text
+------------------------------------------------------------+
| KPIs | Bloqueos | Hitos vencidos | Documentos pendientes   |
+------------------------------------------------------------+
| Equipos con riesgo                                         |
| Proyectos en seguimiento                                   |
| Cronograma resumido                                        |
+------------------------------------------------------------+
```

Decision:

- menos widgets, mas lectura accionable
- acceso a detalle desde cada bloque
