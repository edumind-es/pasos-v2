# 📱 Guía de Usuario - Pasos V2

## 🎯 Bienvenido a Pasos

**Pasos** es un planificador visual offline-first diseñado para el alumnado con necesidades educativas especiales (NEE). Esta aplicación combina la metodología Kanban con pictogramas ARASAAC para hacer la planificación de tareas más visual e intuitiva.

## Estado actual del producto

En marzo de 2026 estamos ejecutando una puesta al dia integral del producto.

- Express y "Local con nombre" siguen trabajando principalmente en este navegador.
- El modo Pro ya permite autenticacion real de docente y generacion de enlaces compartidos mediante backend.
- El progreso del alumnado en la vista compartida sigue guardandose localmente y, cuando el enlace es Pro, tambien puede registrarse en backend para seguimiento docente.
- La proteccion avanzada con contraseña para el modo local y la importacion desde interfaz siguen en desarrollo.

La guia se ira ajustando fase a fase para reflejar solo funcionalidades realmente operativas.

---

## ✨ Funcionalidades Principales

### 1. 📋 Gestión de Tableros Kanban

**Crear tareas:**
- Haz clic en el botón **"+ Añadir tarea"** en cualquier columna
- Escribe el título de la tarea
- La tarea aparecerá instantáneamente en la columna

**Mover tareas entre columnas (Drag & Drop):**
- **Click y mantén** presionado sobre una tarjeta de tarea
- **Arrastra** la tarjeta hacia otra columna
- **Suelta** para completar el movimiento
- La tarea cambiará de estado automáticamente

**Editar tareas:**
- Haz clic en cualquier tarjeta de tarea
- Se abrirá el modal de edición donde puedes:
  - Cambiar el título
  - Añadir o modificar la descripción
  - Agregar etiquetas
  - Añadir pictogramas ARASAAC
  - Adjuntar archivos o URLs

### 2. 🖼️ Pictogramas ARASAAC

Los pictogramas hacen las tareas más visuales y accesibles:

**Buscar y añadir pictogramas:**
1. Abre el modal de edición de una tarea
2. Ve a la sección "Buscar Pictogramas"
3. Escribe una palabra en español (ej: "comer", "estudiar", "jugar")
4. Haz clic en los pictogramas que quieras añadir
5. Los pictogramas se mostrarán en la secuencia visual de la tarea

**Pictogramas se guardan offline:**
- Una vez cargados, los pictogramas quedan en cache
- Funcionan sin conexión a internet

### 3. 📎 Adjuntos

Puedes añadir diferentes tipos de contenido a tus tareas:

**Adjuntar URL o videos:**
1. En el modal de edición, ve a "Adjuntos"
2. Ingresa la URL completa (ej: https://www.youtube.com/watch?v=...)
3. Haz clic en "Añadir URL"
4. Aparecerá el ícono de adjunto en la tarjeta

**Subir imágenes locales:**
1 Haz clic en "Subir imagen local"
2. Selecciona una imagen desde tu dispositivo (**máximo 500KB**)
3. La imagen se convertirá a Base64 y se guardará localmente
4. No necesitas internet para ver tus imágenes adjuntas

### 4. 📱 Instalación como PWA

Pasos puede instalarse como una aplicación nativa en tu dispositivo:

**En escritorio (Chrome, Edge):**
1. Espera 3 segundos después de cargar la página
2. Aparecerá un banner azul en la esquina inferior derecha: **"¡Instala Pasos!"**
3. Haz clic en **"Instalar"**
4. La app se agregará a tu sistema como aplicación instalada

**En dispositivos móviles:**
- **Android (Chrome)**: Aparecerá automáticamente el aviso de instalación
- **iOS (Safari)**: 
  1. Toca el botón de compartir (□↑)
  2. Selecciona "Añadir a pantalla de inicio"
  3. Confirma y la app se instalará

**Beneficios de instalar:**
- Acceso rápido desde el escritorio o pantalla de inicio
- Funciona completamente sin conexión
- Se siente como una aplicación nativa
- No ocupa tanto espacio como una app tradicional

### 5. 🔐 Modos de Acceso

Pasos convive ahora con tres modos de entrada:

- **Acceso Express**: entra rapido sin registro. Todo queda en este navegador.
- **Local con nombre**: separa tableros por nombre y rol dentro del mismo navegador.
- **Modo Pro**: acceso docente con email y contrasena, autenticacion real y compartir por backend.

**Importante:**
- El modo Pro requiere conexion para iniciar sesion y compartir entre dispositivos.
- El trabajo diario del tablero sigue pudiendo continuar localmente incluso si el backend no esta disponible.
- El acceso del alumnado sigue entrando por codigo compartido.

### 6. 🎨 Temas Visuales

Pasos incluye dos temas diseñados para diferentes usuarios:

#### **Tema Profesional** (Predeterminado)
- Fondo oscuro moderno (#0a0612)
- Colores mint (#00d9a3) y sky blue (#00b4d8)
- Fuente sans-serif profesional
- Tamaño de texto: 16px
- Ideal para: Profesores, terapeutas, familias

#### **Tema Estudiante**
- Fondo claro y cálido (#fef7ed)
- Colores vibrantes (naranja #f59e0b, cyan #06b6d4)
- Fuente Comic Neue (amigable y legible)
- Tamaño de texto aumentado: 18px
- Espaciado mayor entre elementos
- Bordes más redondeados
- Ideal para: Alumnado, especialmente con NEE

**Cambiar de tema:**
1. En la barra superior, busca el icono de paleta 🎨
2. Haz clic en el desplegable
3. Selecciona "Profesional" o "Estudiante"
4. El tema cambia instantáneamente
5. Tu preferencia se guarda automáticamente

### 7. 💾 Persistencia y Sincronización

**En modos Express y Local con nombre:**
- Tus tableros, tareas y configuraciones se guardan en `localStorage`
- **NO necesitas conexión a internet** para trabajar
- Los cambios se guardan automáticamente al instante

**En modo Pro:**
- La autenticacion y los enlaces compartidos pasan por backend
- La sesion se restaura automaticamente y los tableros remotos se cargan al entrar
- Los cambios del tablero docente se sincronizan en segundo plano mientras trabajas
- El panel docente muestra estado de sincronizacion, actividad reciente y seguimiento basico de alumnado

**En acceso de alumnado por codigo:**
- Puedes indicar un alias opcional para que el docente vea mejor el seguimiento en enlaces Pro
- Si el enlace pertenece a Pasos Pro, el acceso y el progreso tambien se registran en backend

### 8. 🧩 Biblioteca de Plantillas

Pasos ya incluye una biblioteca reutilizable para trabajo docente:

- **Plantillas base**: rutinas, aula estructurada y sesiones de lenguaje listas para crear tableros nuevos.
- **Plantillas personalizadas**: puedes guardar cualquier tablero actual como plantilla reutilizable.
- **Duplicado inmediato**: desde la biblioteca puedes duplicar el tablero activo para otro grupo o intervención.

**Cómo usarla:**
1. En la barra superior, pulsa **"Plantillas"**
2. Elige una plantilla base o personalizada
3. Pulsa **"Crear tablero"** para generar una nueva copia editable
4. Si quieres conservar una secuencia propia, usa **"Guardar plantilla personalizada"**

**Exportar datos:**
1. Haz clic en el botón **"Exportar"** en la barra superior
2. Se descargará un archivo JSON con todos tus tableros
3. Guarda este archivo como respaldo

**Importar datos** (próximamente):
- Podrás cargar el archivo JSON para restaurar tus datos

### 9. 📚 Documentos y Agenda

Pasos Pro ya incorpora un espacio especifico para recursos y calendarios:

- **Panel Documentos**: crea notas, enlaces, archivos, imagenes, videos, audio o embebidos asociados al tablero activo.
- **Versionado ligero**: cada guardado deja una nueva version visible en el historial del documento.
- **Vinculacion a tareas**: puedes relacionar cada documento con uno o varios pasos del tablero.
- **Vista previa**: los recursos compatibles se muestran dentro del panel antes de abrirlos fuera.
- **Agenda**: la ruta **"Agenda"** recoge fechas objetivo de tareas y asignaciones activas en vista mensual o semanal.
- **Feeds ICS**: en modo Pro puedes generar enlaces de calendario personal o de equipo para suscribirte desde otras apps.

**Cómo usar Documentos:**
1. En la barra superior, pulsa **"Documentos"**
2. Crea un recurso nuevo o selecciona uno existente
3. Define tipo, estado, etiquetas y tareas vinculadas
4. Guarda para registrar una nueva version

**Cómo usar Agenda:**
1. En la barra superior, pulsa **"Agenda"**
2. Cambia entre vista **Mes** o **Semana**
3. Filtra por alcance **Personal** o **Equipo**
4. Si trabajas en Pro, crea un feed **ICS** para tu calendario

### 10. 🗓️ Timeline y Gantt

Pasos ya incorpora una vista ejecutiva para procesos largos:

- **Dependencias**: cada tarjeta puede depender de otras tareas del mismo tablero.
- **Cronograma**: usa fechas de inicio y fecha objetivo para construir una vista temporal real.
- **Timeline**: lectura agrupada por tablero para reuniones de equipo.
- **Gantt**: lectura filtrable por tablero con barras temporales.
- **Capacidad**: resumen de carga por responsable según el esfuerzo estimado.
- **Alertas**: panel de hitos en riesgo, bloqueos y retrasos.

**Cómo usarlo:**
1. Edita una tarea y añade **fecha de inicio**, **fecha objetivo**, **responsable**, **esfuerzo** y **dependencias**
2. En la barra superior, pulsa **"Cronograma"**
3. Cambia entre **Timeline** y **Gantt**
4. Filtra por alcance **Personal** o **Equipo**
5. Si quieres revisar el detalle operativo, abre el tablero desde la propia barra del cronograma

### 11. 🧭 Panel Ejecutivo

Pasos Claustro ya incorpora una lectura transversal para Direccion y Coordinacion:

- **Panel ejecutivo**: resume avance global, bloqueos, retrasos, hitos vencidos y documentos pendientes.
- **Indicadores por equipo**: identifica que equipos concentran mas riesgo o mas carga.
- **Avance por proyecto**: permite abrir cualquier tablero directamente desde la tabla ejecutiva.
- **Bloqueos recurrentes**: agrupa patrones que se repiten entre distintos proyectos.
- **Exportacion CSV**: descarga el estado ejecutivo para reuniones o seguimiento externo.

**Cómo usarlo:**
1. Sitúate en una **organizacion** o **equipo** desde la barra de contexto Pro
2. Pulsa **"Panel ejecutivo"** o el acceso **"Centro"** de la barra superior
3. Filtra por **periodo**, **equipo**, **proyecto** o **responsable**
4. Revisa primero **proyectos**, **documentos pendientes** e **hitos vencidos**
5. Si necesitas intervenir, abre el tablero desde la fila del proyecto

### 12. 🔄 Gestión de Tableros

**Crear nuevo tablero:**
1. Haz clic en **"Mis Tableros"** en la barra superior
2. Selecciona **"+ Nuevo Tablero"**
3. Escribe el nombre del tablero
4. Se creará con las 3 columnas predeterminadas:
   - Por hacer
   - En proceso
   - Terminado

**Cambiar entre tableros:**
1. Haz clic en **"Mis Tableros"**
2. Selecciona el tablero que quieres ver
3. El tablero se cargará instantáneamente

### 12. 🧾 Informe Pedagógico

Ya puedes exportar un informe docente del tablero actual:

1. En la barra superior, pulsa **"Informe"**
2. Se descargará un archivo HTML listo para abrir o imprimir
3. El informe incluye:
   - secuencia del tablero por columnas
   - tareas con recursos y temporizadores
   - resumen pedagógico
   - seguimiento remoto del alumnado si el tablero usa Pasos Pro

**Para copias técnicas de seguridad:**
- Usa **"Backup JSON"** cuando quieras descargar un respaldo estructural del tablero

### 13. 🎭 Modo Presentación

Presenta tus tareas en pantalla completa:

1. Haz clic en **"Presentar"** en la barra superior
2. Se abrirá una vista especial para proyectar
3. Muestra todas las tareas de forma visual
4. Ideal para mostrar el plan del día al alumnado

---

## 🔐 Seguridad y Privacidad

- ✅ **Sin analitica de terceros**: no se envian eventos de seguimiento comercial
- ✅ **Modo local disponible**: Express y Local con nombre siguen funcionando sin cuenta externa
- ✅ **Modo Pro activo**: login, cookies seguras y codigos compartidos pasan por backend
- ✅ **Centro de datos en la app**: puedes revisar almacenamiento, caches, service worker y limpiar datos operativos desde la interfaz
- ✅ **Codigo abierto**: transparencia total
- ⏳ **En despliegue**: endurecimiento adicional del modo local y ampliacion de evidencias avanzadas

---

## 🗃️ Centro de Datos y Caché

Desde el menu de usuario del docente ya tienes acceso a **"Centro de datos"**.

Ahí puedes:
- exportar la telemetria local
- limpiar progreso de alumnado y eventos locales sin borrar tus tableros
- restablecer cache y service worker de la PWA
- ejecutar un borrado total del almacenamiento local del navegador

Tambien veras una explicacion visible de:
- qué usa `localStorage`
- qué usa `sessionStorage`
- qué cookies visibles intervienen
- qué caches PWA están activas
- cómo se comporta Pasos en modo local frente a modo Pro

## 🆘 Solución de Problemas

**"No puedo arrastrar las tareas"**
- Asegúrate de hacer click y mantener presionado
- Arrastra lentamente hasta la columna destino
- Si no funciona, edita la tarea y cambia su columna manualmente

**"Las imágenes no se cargan"**
- Las imágenes locales deben ser menores a 500KB
- Formatos soportados: JPG, PNG, GIF, WEBP
- Reduce el tamaño de la imagen si es necesario

**"No aparece el banner de instalación"**
- Solo aparece en navegadores compatibles (Chrome, Edge, Safari iOS)
- Ya podría estar instalada la app
- En navegadores de escritorio, busca el icono de instalación en la barra de direcciones (⊕)

**"He perdido mis datos"**
- Los datos se guardan en localStorage del navegador
- Si borras los datos del navegador, se perderán
- Exporta regularmente para tener respaldos
- No uses modo incógnito/privado

---

## 🚀 Próximas Funcionalidades

- 🔒 Cifrado opcional con contraseña para modo local
- 📤 Importación de datos exportados
- 🔔 Recordatorios opcionales
- 🌐 Sincronización continua de cambios en modo Pro
- 🎙️ Texto a voz para tareas
- 📊 Estadísticas de productividad
- 👥 Modo multiusuario local

---

## 💡 Consejos de Uso

**Para profesores/terapeutas:**
- Crea un tablero por alumno o grupo
- Usa pictogramas para reforzar conceptos
- Exporta los tableros periódicamente como respaldo
- Usa el tema Profesional para trabajar

**Para alumnado:**
- Usa el tema Estudiante para mejor legibilidad
- Añade muchos pictogramas a tus tareas
- Arrastra las tareas cuando las completes
- Instala la app para acceso rápido

**Para familias:**
- Crea un tablero de rutinas familiares
- Usa pictogramas para hacerlo visual
- Adjunta fotos de actividades reales
- Presenta el plan del día cada mañana

---

## 📞 Soporte

¿Necesitas ayuda o tienes sugerencias?

- 📧 Email: contacto@edumind.es
- 🌐 Web: https://edumind.es
- 📚 Documentación: https://docs.edumind.es/pasos

---

**Versión**: 2.1.0  
**Licencia**: GNU AGPL v3.0  
**Desarrollado con ❤️ por EDUmind**

*Educación Inclusiva para Todos*
