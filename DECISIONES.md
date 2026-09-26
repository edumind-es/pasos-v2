# Decisiones de diseño de Pasos

> Redactado a posteriori el 2026-09-26, a partir del código, de PRIVACIDAD.md, de las
> migraciones y de los mensajes de commit. Describe cómo funciona hoy el recurso y por qué.
> Las decisiones nuevas se añaden al final con su fecha.

## 1. Local-first: el tablero vive en el navegador

Los modos **Express** y **Local con nombre** guardan tableros, ajustes y progreso en
`localStorage` (`pasos-v2-storage`). No hay cuenta, correo ni servidor. Motivo: un docente
debe poder usar Pasos en el aula sin dar de alta a nadie ni depender de la red; y el
alumnado con necesidades de apoyo no debería dejar rastro en ningún servidor para seguir
una rutina.

## 2. El alumnado no tiene nombre en el sistema

El acceso por código genera un UUID en el navegador del alumno (`learner_key`) y un apodo
calculado («Lince 7», `src/utils/apodoAlumno.ts`). La migración
`backend/alembic/versions/20260825_0011_sin_nombre_alumnado.py` eliminó la columna
`learner_label` en vez de dejarla vacía: «una columna que puede volver a rellenarse es una
tentación». La correspondencia apodo → nombre real existe solo en la **libreta** local del
docente (`src/utils/libretaDocente.ts`) y nunca se envía.

## 3. Modo Pro opcional, con SSO, y con lo que todavía no está resuelto escrito

El modo Pro (FastAPI + PostgreSQL) existe para sincronizar entre dispositivos y ver el
seguimiento del alumnado. Es opt-in: la portada ofrece Express por defecto y el SSO de
Authentik solo entra al pulsarlo. Lo que se guarda, cuánto tiempo y cómo se purga
(`backend/purgar_datos.py`, temporizador diario) está en PRIVACIDAD.md, incluidas las
carencias (sin cifrado en reposo, sin registro de tratamiento). Se prefiere decirlo a
callarlo.

## 4. Sin analítica ni terceros al abrir

No hay Matomo, Google Analytics ni similares. La «telemetría» de `appTelemetry.ts` son
eventos locales (máximo 120) que solo se exportan a mano desde el Centro de datos. Las
tipografías se sirven desde `public/fonts/` para no llamar a Google Fonts. Al abrir la
app la única red es el propio dominio.

## 5. ARASAAC como fuente de pictogramas, cargada al usarla

Los pictogramas se buscan en `api.arasaac.org` y se muestran desde `static.arasaac.org`
solo cuando el docente busca o cuando una tarjeta con pictogramas se dibuja. No se
redistribuyen en el repositorio porque su licencia es CC BY-NC-SA (no comercial): quien
haga un uso comercial de Pasos debe cambiar la fuente (`src/utils/arasaac.ts`). La fórmula
de atribución exigida va en el pie y en CREDITS.md.

## 6. «Asistente IA» sin IA

El asistente convierte listas, guiones y Markdown en tareas con analizadores
deterministas en el navegador (`src/utils/parsers.ts`, `sessionTemplate.ts`). No se llama
a ningún modelo: no hay coste, no hay envío de texto de aula a terceros (salvo los
títulos a ARASAAC para buscar pictogramas) y el resultado es reproducible. El nombre se
mantiene porque el prompt de la FAQ está pensado para que el docente genere la sesión con
la IA que quiera y la pegue o la arrastre.

## 7. Accesibilidad como parte del producto

Modo tinta electrónica por defecto (menos luz azul, contraste ≥4,5:1 en texto), tamaño
de letra y OpenDyslexic, manejo completo por teclado (incluido mover tareas con Espacio y
flechas), pictogramas con texto alternativo. Motivo: el público principal es alumnado con
necesidades de apoyo y docentes que proyectan en aulas con luz variable.

## 8. Licencia doble AGPL-3.0-or-later / EUPL-1.2 y marca aparte

AGPL obliga a publicar el código de lo que se sirve por red (por eso el repositorio
público debe ir siempre a la par de producción y etiquetado); EUPL-1.2 facilita la
reutilización por administraciones europeas. La marca EDUmind® no se cede con el código.

## 9. Todo en español

Código nuevo, comentarios, documentación, commits e issues en español: es la lengua del
aula a la que sirve el recurso y de quien lo mantiene (ver CONTRIBUTING.md).

## 10. Release pública saneada

El repositorio público no contiene secretos, configuración de despliegue ni datos de
aula (OPEN_SOURCE_RELEASE.md). Se sincroniza por contenido desde el árbol privado; el
historial público no reproduce el privado.
