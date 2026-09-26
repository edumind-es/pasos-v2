# Registro de cambios

Formato libre, en español, una entrada por versión publicada.

## 2.3.1 — 2026-09-26

Corrección tras la evaluación VCER (rúbrica de valoración de recursos educativos digitales).

- Publicado el código de la 2.3.0 que ya corría en producción (art. 13 AGPL) y etiquetado.
- Accesibilidad: nombres accesibles en botones «X», `htmlFor` en los selects del modal,
  contraste ≥4,5:1 en el texto auxiliar del modo tinta electrónica y en los colores de
  mundo usados como texto, mover tareas con teclado (KeyboardSensor), `h1` en el tablero.
- Créditos: CREDITS.md, fórmula de atribución de ARASAAC en el pie, OFL.txt junto a las
  tipografías; eliminado `vite.svg`.
- Coherencia: tutorial, FAQ y GUIA_USUARIO.md actualizados a lo que la app hace.
- Licencia: COPYRIGHT y AUTHORS alineados con la doble licencia.
- README: secciones «Hecho con IA» y «Cómo modificarlo»; DECISIONES.md y este CHANGELOG.

## 2.3.0 — 2026-09-25

- «Entrar con el móvil»: QR en el ordenador y aprobación desde el móvil vía Authentik
  (flujo de código de dispositivo).
- Crear la sesión arrastrando la plantilla `.md` sobre el tablero (Apertura, Núcleo,
  Cierre y Recordatorios); prompt para generarla en la FAQ.
- Pruebas nuevas de frontend (parsers, sessionTemplate, EntrarConMovil), de backend
  (dispositivo, arranque, log, política de secretos) y e2e (PWA, arrastrar sesión).

## 2.2.0 — 2026-09-06

- Primera publicación en `edumind-es/pasos-v2`; autoría única de Luis Vilela Acuña.
- Arranque abortado si los secretos JWT son inseguros.
- El alumnado ya no indica alias: clave anónima y apodo calculado (2026-08-25).
