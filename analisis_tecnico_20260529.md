Análisis Técnico y UX/UI — Pasos V2
Fecha: 29 mayo 2026 | Versión analizada: 2.1.0 | Rol: Senior Lead IT

1. ESTADO ACTUAL — RADIOGRAFÍA GENERAL
Pasos V2 es una app con arquitectura sólida, stack moderno (React 19 + FastAPI + PostgreSQL) y un dominio pedagógico cuidado. Sin embargo, ha crecido de forma acumulativa —funcionalidad añadida sobre funcionalidad— sin una revisión estructural del resultado final. El efecto: una app técnicamente capaz pero visualmente abrumadora y funcionalmente dispersa.

2. PROBLEMAS CRÍTICOS — PRIORIDAD ALTA
2.1 BoardView.tsx: componente monolítico de 88 KB
Este es el problema arquitectural más grave del frontend. Un único archivo gestiona:

20+ hooks useState independientes (share modal, AI wizard, template library, storage center, assignments, documents, column dialogs, undo/trash, selection mode, filter, remote insights, user menu…)
DnD context completo
5 sub-componentes locales (BoardSwitcherButton, ClassroomQuickCreate, WorkspacePanelsMenu, EditableBoardTitle, TextActionDialog, ConfirmDialog)
Lógica de negocio mezclada con rendering
Condicionales de modo (isClassroomWorkspace, isProUser, isEmbedded, compactEmbed, isReadOnlyBoard) multiplicados por toda la JSX
Consecuencia directa: cualquier cambio en cualquier zona del BoardView puede afectar cualquier otra. Los re-renders son innecesariamente amplios.

2.2 Header: saturación de acciones (14–16 elementos interactivos)
La cabecera sticky del modo Aula contiene, en una sola fila:

Zona	Elementos
Izquierda	Logo + título tablero editable
Derecha	Mis tableros · Accesibilidad · Modo visual · Presentar · Hoy · Agenda · Cronograma · Asignar · Documentos · Plantillas · Informe · Backup JSON · IA/Magia · Compartir · Avatar usuario
Eso es entre 13 y 15 botones de acción antes de llegar al contenido. Con pantallas medias (1280px), el header colapsa en dos filas de texto pequeño. Es el punto de mayor fricción visual identificado.

2.3 Duplicación del sistema de colores CSS
Existen dos sistemas paralelos con valores distintos:


/* Sistema 1: :root (variables CSS clásicas) */
--lme-primary: #00d9a3;     /* verde-azulado */
--lme-background: #0a0612;

/* Sistema 2: @theme Tailwind */
--color-mint: #3ddad7;       /* DIFERENTE verde-azulado */
--color-sky:  #3c7dff;
--color-bg0:  #040614;       /* DIFERENTE oscuro */
El resultado es que bg-mint (Tailwind) y var(--lme-mint) producen colores distintos. Cuando el modo E-ink sobreescribe alguna de estas capas, la coherencia visual se rompe parcialmente. El archivo eink.css tiene 69.6 KB —comparable en tamaño a React Router completo— lo que sugiere que la convivencia E-ink/EDUmind se ha resuelto por acumulación de overrides.

2.4 Error de renderizado en WorkspaceHomeView.tsx
Línea 56–57 de WorkspaceHomeView.tsx:


`Pasos Aula` se centra en secuencias...  `Pasos Claustro`
organiza proyectos...
Los backticks aparecen literalmente como texto en el DOM. El usuario ve: `Pasos Aula` se centra en... con las comillas invertidas visibles. Debería ser comillas tipográficas o etiquetas <strong>.

3. PROBLEMAS SIGNIFICATIVOS — PRIORIDAD MEDIA
3.1 Estructura de paneles bajo el Kanban — ruido vertical
El BoardView tiene esta estructura vertical en modo Aula:


[Header 64px]
  [Section: título tablero + WorkspacePanelsMenu]
    [Accordion: Entrada rápida]
    [BoardToolbar: filtros + búsqueda]
    [DnD Kanban ← EL ELEMENTO CENTRAL]
  [Section: space-y-3]
    [Accordion: Resumen docente]
    [Accordion: Compartir y sincronización]
    [Accordion: Actividad reciente]
    [Accordion: Seguimiento del alumnado]
[Footer EDUmind]
El Kanban queda enterrado en el centro de un sandwich de información. El usuario tiene que hacer scroll para llegar al tablero, y los paneles inferiores compiten visualmente con él. La intención de los acordeones es correcta (colapsar por defecto), pero la cantidad de acordeones activos simultáneamente anula el efecto.

3.2 BoardColumn y TaskCard: anchura fija vs. responsive
Las columnas usan w-[min(20rem,calc(100vw-3rem))] sm:w-80. Esto funciona bien en desktop pero en tablets produce columnas cortadas con scroll horizontal inconsistente. Las tarjetas dentro de las columnas pueden mostrar texto truncado sin indicación visual clara de que hay más contenido.

3.3 Área modo Organización sin Pro: pantalla de bloqueo pobre
Cuando un usuario sin Pro intenta acceder a /organizacion, ve:


<section className="mt-8 rounded-[28px] border border-amber-400/30 ...">
Es una pantalla de error sin ruta de conversión ni contexto pedagógico. Un usuario legítimo que se equivoca de ruta queda atrapado sin CTA claro.

3.4 Dependencias duplicadas de color en botones del header
Cada botón del header tiene su propia clase de color hardcodeada:


// Presentar → sky
border-sky/30 bg-sky/10 text-sky

// Asignar → mint  
border-mint/30 bg-mint/10 text-mint

// Documentos → amber
border-amber-400/30 bg-amber-400/10 text-amber-200

// Plantillas → indigo
border-indigo-500/30 bg-indigo-500/10 text-indigo-300

// Informe → amber
border-amber-400/30 bg-amber-400/10 text-amber-200

// IA/Magia → gradient indigo→purple
Sin sistema de variantes de botón, cada acción tiene su propia lógica de color. Además, Documentos e Informe comparten color amber siendo funciones diferentes, mientras que Plantillas y IA/Magia comparten indigo. La semántica visual está rota.

3.5 Modales y diálogos: z-index stack complejo
Se usan niveles z-[90], z-[100], z-[110] y posiblemente más. Sin un sistema documentado de layers, agregar un nuevo modal o panel puede provocar que elementos queden tapados o al revés. Ya hay casos donde un overlay fixed inset-0 z-[90] cierra el menú de usuario cuando debería dejarlo abierto.

3.6 Backend: executive_service.py de 519 líneas
El servicio del dashboard ejecutivo es el más extenso y concentra lógica de reporting, agregación y exportación CSV. Para un dashboard que tiene una única ruta (GET /executive/dashboard), esto indica que el servicio mezcla responsabilidades que deberían estar separadas.

3.7 Snapshot JSONB en la tabla boards
El campo snapshot de tipo JSONB contiene columnas y tareas completas. Esto significa que:

Cada PUT /boards/{id} serializa el tablero entero
No hay historial de cambios a nivel de tarea
Si el board crece (muchas tareas), el payload de sincronización es siempre total
Las queries de análisis (insights, timeline, executive) deben parsear JSONB, lo que puede ser costoso a escala
3.8 Estado de sincronización Pro sin feedback visual claro
Los estados proSyncState / lastProSyncAt / lastProSyncError están en el store pero el feedback al usuario cuando hay un error de sync no es prominente. Un docente podría estar trabajando offline sin saberlo y perder cambios.

4. MEJORAS DE FUNCIONALIDAD IDENTIFICADAS
4.1 Modo Aula: el Kanban debe ser el protagonista inmediato
Problema: el Kanban aparece debajo del título, la entrada rápida y la toolbar. En resoluciones 1080p normales, ocupa aproximadamente el 40% inferior del viewport al entrar.

Solución: layout de dos zonas — barra lateral izquierda para paneles de apoyo docente, área derecha 100% para el Kanban. Los paneles acordeón desaparecen debajo y se convierten en un sidebar colapsable.

4.2 Header: agrupar acciones por frecuencia de uso
Clasificación actual de acciones del header por frecuencia esperada:

Frecuencia	Acciones
Siempre	Tableros, búsqueda/filtro, modo visual
Clase activa	Presentar, Hoy, Compartir, Asignar
Ocasional	Agenda, Cronograma, Plantillas
Raramente	Documentos, Informe, Backup JSON, IA/Magia
Admin	Usuario, Centro
Las acciones de frecuencia "ocasional" y "raramente" deberían vivir en un menú secundario ··· o en un drawer lateral, no en la cabecera principal.

4.3 TaskCard: información pedagógica en segundo nivel
Las tarjetas muestran simultáneamente: icono principal, pictogramas, etiquetas, tipo de tarea, estado pedagógico, fechas, adjuntos. En tarjetas con datos completos el contenido se comprime y el texto se trunca sin indicación.

Solución: modo compacto por defecto (título + estado + 1 pictograma) con expansión al hover o click sin abrir el modal completo.

4.4 SharedBoardView: experiencia del alumno sin pulir
La vista de alumno (/compartir/:code) no ha recibido el mismo nivel de atención que la vista docente. Es el punto de contacto directo con el alumnado y debería ser la vista más simple, accesible y clara de toda la app.

4.5 BoardToolbar: redundancia con el header
La toolbar del tablero incluye filtros de color, búsqueda, modo selección, acceso a papelera, y acceso a secuencia. Algunas de estas acciones ya tienen presencia en el header. La diferenciación entre "qué vive en el header" y "qué vive en la toolbar" no es intuitiva.

4.6 Pantalla de empty state: "no hay tablero activo"
Cuando no hay tablero, se muestra una sección con texto explicativo y botones. Es funcional pero fría. Para un docente que abre la app por primera vez, este momento debería ser de onboarding activo con plantillas sugeridas visibles, no un formulario vacío.

5. INCOHERENCIAS VISUALES CONCRETAS
Elemento	Problema
Radios de borde	Mezcla de rounded-xl, rounded-2xl, rounded-[24px], rounded-[28px], rounded-[30px], rounded-[32px] sin jerarquía
Botones primarios	bg-sky, bg-mint, bg-lme-primary usados indistintamente para acciones principales
Tipografía	text-xs font-bold uppercase tracking-wide (label) vs text-xs font-bold uppercase tracking-[0.18em] vs tracking-[0.24em] sin sistema
Secciones	p-4 sm:p-5 xl:p-6 vs p-6 vs p-4 en secciones hermanas del mismo nivel
border-amber-400/30	Usado para Documentos, Informe Y alertas de readonly — tres semánticas diferentes, mismo estilo
Texto backtick	WorkspaceHomeView línea 56 renderiza comillas invertidas como texto literal
bg-lme-background vs bg-bg0	Dos tokens para el mismo fondo, usados en archivos diferentes
6. ANÁLISIS CSS: DEUDA ACUMULADA
El archivo eink.css de 69.6 KB es síntoma de un problema de arquitectura CSS:

El tema E-ink se implementa como una capa masiva de overrides sobre el sistema Tailwind
No existe un sistema de design tokens unificado que ambos temas compartan
Los colores en :root y en @theme tienen valores distintos para conceptos equivalentes
@theme de Tailwind v4 y las custom properties de :root coexisten sin una fuente única de verdad
Recomendación estructural: definir un único set de tokens semánticos (ej: --color-primary, --color-surface, --color-text) y hacer que tanto el tema EDUmind como E-ink solo sobreescriban esos tokens. Reduciría eink.css de ~1700 líneas a ~50–80.

7. BACKEND: PUNTOS DE FRICCIÓN
Área	Problema
Snapshot JSONB	Sincronización total en cada save; sin diff parcial; crecerá con el tiempo
executive_service.py 519L	Monolito de reporting; mezcla agregación, filtrado y serialización CSV
Sin paginación en /boards	Si un usuario acumula muchos tableros, la respuesta no está paginada
board_activity_events	Sin TTL ni archivado; puede crecer indefinidamente
Rate limiting auth	Solo limitado en SSO endpoints; /auth/login sin rate limit específico visible
Refresh token cookie	Correcto el enfoque HTTPOnly, pero sin rotación de refresh en cada uso si se pierde el access token
8. PLAN DE ACCIÓN PRIORIZADO
Fase 0 — Correcciones inmediatas (1–2 sesiones)
Corregir bug backtick en WorkspaceHomeView.tsx:56 — cambiar backticks a comillas tipográficas o <strong>
Unificar los dos fondo tokens — bg-bg0 y bg-lme-background deberían apuntar al mismo valor
Añadir rate limiting en /auth/login local igual que en SSO
Feedback visible de sync error — cuando lastProSyncError existe, mostrar badge persistente en header
Fase 1 — Reducción de ruido en modo Aula (3–5 sesiones)
Consolidar header — máximo 6–7 elementos visibles, resto en menú ···
Layout de sidebar — panel de apoyo docente como sidebar colapsable izquierdo, Kanban ocupa el 100% derecho
Sistema de variantes de botón — definir btn-primary, btn-secondary, btn-action-{color} en CSS/Tailwind y aplicar consistentemente
Corregir radios de borde — definir escala: sm=8px, md=12px, lg=16px, xl=24px y aplicar por jerarquía
Fase 2 — Arquitectura CSS (2–3 sesiones)
Tokens semánticos unificados — crear un layer de tokens que comparten E-ink y EDUmind
Reducir eink.css — pasar de overrides masivos a sobreescritura de tokens
Eliminar duplicación de variables — un solo sistema :root + @theme Tailwind coherente
Fase 3 — Refactor componentes (4–6 sesiones)
Partir BoardView.tsx — extraer: BoardHeader, BoardPanelSection, BoardSharePanel, BoardDialogManager; el componente principal debería quedar en ~200–300 líneas
TaskCard modo compacto — primario (título + estado) / expandido al hover
SharedBoardView (alumno) — revisión completa de UX, accesibilidad first
Empty state con onboarding — mostrar plantillas sugeridas al no haber tablero
Fase 4 — Backend (futuro, según carga real)
Paginación en /boards — implementar cursor-based pagination
Diff parcial en sync — en lugar de snapshot total, enviar solo tareas/columnas modificadas
TTL en activity events — archivar eventos con más de 90 días a tabla de archivo
9. FORTALEZAS A PRESERVAR
Stack moderno y bien elegido (React 19 + FastAPI + Zustand)
Sistema PWA offline-first bien implementado
Integración ARASAAC con cache de 7 días
SSO OIDC/Authentik ya funcional
Modo embed para board.edumind.es funcionando
Accesibilidad contemplada (fuentes, E-ink, controles)
Sistema de plantillas y presets de tablero
Telemetría interna con niveles (info/warning/error)
Tests E2E con Playwright presentes
RESUMEN EJECUTIVO
La app tiene bases sólidas pero ha llegado a un punto donde la acumulación de funcionalidades ha erosionado la claridad. El elemento central (el Kanban) compite visualmente con los elementos de soporte que deberían ser secundarios. El header está saturado. El CSS tiene deuda técnica significativa con dos sistemas de color paralelos.

Las intervenciones más impactantes, por orden: consolidar el header, dar al Kanban protagonismo inmediato en el layout, corregir las incoherencias visuales tipológicas y partir BoardView.tsx. Ninguna de estas acciones elimina funcionalidad — la reorgamizan para que sea accesible cuando se necesita, invisible cuando no.

¿Quieres que empecemos por alguna fase concreta, o prefieres que prepare un plan de implementación detallado para alguno de los puntos específicos?