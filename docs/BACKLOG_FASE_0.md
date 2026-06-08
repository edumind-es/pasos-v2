# Backlog Fase 0

Estado: en ejecucion

## P0 producto y confianza

- [x] Crear plan de ejecucion del producto dentro del repo.
- [ ] Alinear textos de login, seguridad y compartir con el comportamiento real.
- [ ] Corregir vista compartida para que use el tablero referenciado y no el tablero activo.
- [ ] Marcar el compartir actual como beta local hasta disponer de backend.
- [ ] Actualizar guia de usuario y FAQ con alcance real del producto.

## P0 calidad tecnica

- [ ] Eliminar hooks condicionales en `src/components/TaskModal.tsx`.
- [ ] Corregir referencias antes de declaracion en `src/components/AccessibilityControls.tsx`.
- [ ] Corregir referencias antes de declaracion en `src/pages/AccessCodePage.tsx`.
- [ ] Separar `useConfetti` de `src/components/Confetti.tsx`.
- [ ] Quitar fuentes de aleatoriedad durante render en `src/components/Confetti.tsx`.
- [ ] Revisar efectos con `setState` en componentes de UI critica.

## P0 arquitectura y despliegue

- [ ] Documentar arquitectura actual de `pasos.edumind.es`.
- [ ] Documentar arquitectura objetivo frontend + API + persistencia.
- [ ] Unificar estrategia de PWA y service worker.
- [ ] Revisar discrepancias entre Nginx local y cabeceras reales de produccion.

## P1 siguiente bloque

- [ ] Diseñar modelo de datos backend para usuario, aula, tablero, asignacion y progreso.
- [ ] Crear scaffold inicial de API.
- [ ] Definir entornos `dev`, `staging` y `prod`.
- [ ] Sustituir `prompt` y `confirm` por componentes propios en flujos clave.
