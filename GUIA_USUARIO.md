# Guía de usuario — Pasos

**Pasos** es un tablero visual para secuenciar sesiones y rutinas de aula con pictogramas
de ARASAAC. El docente crea el tablero (a mano, desde una plantilla, pegando una lista o
arrastrando una sesión en `.md`), lo proyecta y lo comparte por código; el alumnado marca
los pasos hechos. Esta guía describe la versión 2.3 y solo lo que funciona hoy.

## 1. Modos de acceso

- **Acceso Express**: entra sin registro. Todo queda en este navegador (`localStorage`).
- **Local con nombre**: eliges un nombre y un rol (docente/alumno) solo para separar
  espacios dentro del mismo navegador. No es un registro: no se pide correo.
- **Modo Pro**: cuenta docente (correo y contraseña de 12 caracteres como mínimo) o
  **Entrar con EDUmind SSO**. Sincroniza tableros entre dispositivos y permite el
  seguimiento del alumnado en el servidor de EDUmind. Necesita conexión.
- **Entrar con el móvil** (modo Pro): en el ordenador se muestra un código QR; lo apruebas
  desde el móvil con tu sesión SSO y el ordenador queda identificado sin teclear la
  contraseña.
- **Código de alumno**: el alumnado entra con el código que le da el docente. **No se le
  pide el nombre**: la app genera una clave anónima en su navegador y un apodo del tipo
  «Lince 7». El docente puede anotar en su **libreta** local a quién corresponde cada apodo;
  esa libreta no sale de su navegador.

## 2. El tablero

- **Añadir Tarea**: botón al final de cada columna. Escribe el título y pulsa Enter.
- **Editar**: pulsa la tarjeta para abrir el modal (título, descripción, tipo de tarjeta,
  estado pedagógico, fechas, responsable, dependencias, temporizador, pictogramas, adjuntos).
- **Mover**: arrastra la tarjeta a otra columna. **Sin ratón**: con el foco en la tarjeta,
  Espacio o Enter la levanta, las flechas la mueven, Espacio o Enter la suelta, Esc cancela.
- **Columnas por defecto** de un tablero de aula: *Por hacer*, *En proceso*, *Terminado*
  (puedes renombrarlas, añadir más o eliminarlas).
- **Filtrar** por texto o color, **Papelera** para recuperar tareas borradas, y **Presentar**
  para proyectar el tablero a pantalla completa (flechas para navegar, espacio para el
  temporizador, F pantalla completa, Esc para salir).

## 3. Pictogramas ARASAAC

1. Abre la tarea y ve a la pestaña **Pictogramas**.
2. Escribe una palabra en español y pulsa **Buscar**.
3. Pulsa los pictogramas que quieras añadir; aparecen en la tarjeta y en Presentar.

La búsqueda y las imágenes se cargan de `arasaac.org`, así que **necesitan conexión**. El
navegador guarda en caché las búsquedas recientes (siete días), no las imágenes: sin
conexión verás solo las que el navegador tenga ya cargadas.

Atribución obligatoria de los pictogramas (aparece en el pie de la app):
*Autor pictogramas: Sergio Palao. Origen: ARASAAC (http://www.arasaac.org). Licencia:
CC BY-NC-SA. Propiedad: Gobierno de Aragón (España).*

## 4. Crear tableros más rápido

Menú **Herramientas** de la barra superior:

- **Plantillas**: rutina de la mañana, bloque de aula estructurada y sesión de lenguaje y
  comunicación, listas para crear un tablero nuevo. Cualquier tablero puede guardarse como
  plantilla personalizada y duplicarse para otro grupo.
- **Asistente IA**: pega una lista, un guion o un Markdown y Pasos lo convierte en tareas.
  A pesar del nombre, **no usa ningún modelo de IA**: es un analizador de texto que corre
  en tu navegador. Solo los títulos de las tareas se envían a ARASAAC para buscar
  pictogramas; no escribas nombres de alumnos en los títulos si no quieres que salgan de
  tu dispositivo.
- **Sesión en `.md`**: arrastra sobre el tablero un archivo Markdown con la plantilla de
  sesión (la FAQ incluye el prompt para generarla) y Pasos crea las columnas Apertura,
  Núcleo, Cierre y Recordatorios. El archivo se lee en tu dispositivo.

## 5. Exportar

Menú **Exportar** de la barra superior:

- **Informe pedagógico**: descarga un HTML del tablero activo con la secuencia por
  columnas, recursos, temporizadores y, si el tablero es Pro, el seguimiento del alumnado.
  Si has anotado nombres reales en la libreta, el informe puede incluirlos: trátalo como un
  documento con datos personales.
- **Copia de seguridad (JSON)**: descarga las columnas y tareas **del tablero activo**
  (no de todos los tableros), sin nombres. No hay importación desde la interfaz.
- En modo Pro, **Cronograma** y **Centro** permiten descargar CSV de tareas y del panel
  ejecutivo.

## 6. Compartir con el alumnado

1. Pulsa **Compartir** y genera un código corto.
2. El alumnado abre Pasos, elige **Código de alumno** e introduce el código.
3. Marca cada paso como hecho o pide ayuda. En modo Express/Local ese progreso queda en el
   navegador del alumno; si el tablero es Pro, se envía al servidor bajo su clave anónima
   para que el docente lo vea en su panel.

## 7. Apariencia y accesibilidad

Botón **Apariencia y accesibilidad** en la barra superior:

- **Tinta electrónica** (por defecto) o **Color** (paleta de Los Cinco Mundos de EDUmind).
- Tamaño de letra y tipografía, incluida **OpenDyslexic**. Las tipografías se sirven desde
  la propia app, sin llamadas a Google Fonts.
- Toda la app se maneja con teclado: Tab para recorrer, Enter/Espacio para activar, Esc
  para cerrar diálogos.

## 8. Modo Pro: documentos, agenda, cronograma y panel ejecutivo

Solo con cuenta Pro y conexión:

- **Documentos**: notas, enlaces, archivos y embebidos asociados al tablero, con historial
  de versiones y vínculo a tareas.
- **Agenda**: fechas objetivo de tareas y asignaciones en vista mensual o semanal; enlaces
  ICS para suscribirse desde otros calendarios.
- **Cronograma**: vista temporal y Gantt a partir de fechas, responsables, esfuerzo y
  dependencias.
- **Centro** (panel ejecutivo): avance por equipo y proyecto, bloqueos, hitos vencidos y
  exportación CSV, para coordinación o dirección.

## 9. Instalar como aplicación (PWA)

Pasos se puede instalar en escritorio (icono en la barra de direcciones o aviso
«Instalar») y en móvil (Android: aviso de instalación; iOS: Compartir → «Añadir a pantalla
de inicio»). Instalada y sin conexión funcionan los tableros locales, las plantillas, el
tutorial y la exportación; no funcionan la búsqueda de pictogramas, las imágenes que el
navegador no tenga en caché ni nada del modo Pro.

## 10. Tus datos

- Express y Local: tableros, ajustes y progreso viven en `localStorage` de este
  navegador. Si borras los datos del navegador se pierden: haz copias de seguridad.
- Pro: los tableros y el seguimiento se guardan en el servidor de EDUmind; el token de
  sesión va en `sessionStorage` y el de refresco en una cookie segura. Qué se guarda, cuánto
  tiempo y cómo se purga está en [PRIVACIDAD.md](PRIVACIDAD.md).
- **Centro de datos** (menú de usuario): muestra qué hay en `localStorage`,
  `sessionStorage`, cookies y cachés de la PWA; permite exportar la telemetría local
  (eventos de uso que nunca salen del navegador), borrar el progreso del alumnado, vaciar
  cachés y restablecer todo.
- No hay analítica ni rastreadores de terceros. Al abrir la app no se conecta con nadie;
  solo con `arasaac.org` al buscar pictogramas y con `pasos.edumind.es/api` en modo Pro.

## 11. Problemas frecuentes

- **No puedo arrastrar**: mantén pulsado y mueve al menos unos milímetros antes de soltar;
  o usa el teclado (apartado 2).
- **No aparecen pictogramas**: comprueba la conexión; ARASAAC está fuera de la app.
- **He perdido mis tableros**: en Express/Local dependen del navegador; no uses ventana
  privada y guarda copias JSON.
- **La app no se actualiza**: en Centro de datos, «restablecer caché y service worker».

## 12. Ayuda y contacto

- Ayuda dentro de la app: botón flotante de ayuda (FAQ) y tutorial interactivo.
- Fallos y sugerencias: https://github.com/edumind-es/pasos-v2/issues
- Correo: contacto@edumind.es · Web: https://edumind.es

---

Pasos · Luis Vilela Acuña · EDUmind® · Licencia doble AGPL-3.0-or-later / EUPL-1.2.
Créditos de pictogramas, tipografías y librerías en [CREDITS.md](CREDITS.md).
