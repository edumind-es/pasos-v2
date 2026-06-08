# Plan de Expansión - Pasos V2

## 🎯 Objetivos

### 1. 🔒 Seguridad
- **Encriptación de datos locales**: Cifrar datos en localStorage con clave del usuario
- **Autenticación básica**: Sistema de contraseña para proteger tableros
- **Validación de datos**: Sanitización de inputs para prevenir XSS
- **Exportación segura**: Opción de exportar datos con contraseña

### 2. 📱 PWA (Progressive Web App)
- **Manifest**: `manifest.json` con configuración completa
- **Service Worker**: Cache offline de recursos estáticos
- **Iconos**: Set completo de iconos (192x192, 512x512, favicon)
- **Instalabilidad**: Botón "Instalar App" en la interfaz
- **Offline-First**: Funcionamiento completo sin conexión
- **Notificaciones**: (Opcional) Recordatorios de tareas

### 3. 📦 Sistema Auto-Instalable para Distribución
- **Build optimizado**: Configuración de Vite para producción
- **Empaquetado**: Script para generar `.zip` distribuible
- **Documentación**: README con instrucciones de instalación
- **Servidor simple**: Script Python/Node para servir la app
- **Landing page**: Página de descarga/instalación en web EDUmind
- **Versionado**: Sistema de versiones para actualizaciones

### 4. 🎨 Tema Alternativo para Alumnado
- **Tema "Estudiante"**: Colores más vibrantes, iconos grandes, tipografía amigable
- **Selector de tema**: Toggle en la interfaz para cambiar entre temas
- **Persistencia**: Guardar preferencia de tema en localStorage
- **Pictogramas destacados**: Mayor énfasis visual en pictogramas ARASAAC
- **Modo simplificado**: Opciones avanzadas ocultas por defecto
- **Accesibilidad mejorada**: Contraste WCAG AAA, tamaños de fuente ajustables

---

## 📋 Orden de Implementación Propuesto

### Fase 1: PWA (Base para todo)
1. Crear `manifest.json`
2. Generar iconos
3. Implementar Service Worker básico
4. Añadir botón "Instalar App"
5. Probar instalación en mobile/desktop

### Fase 2: Tema para Alumnado
1. Crear sistema de temas en CSS
2. Diseñar tema "Estudiante"
3. Implementar selector de tema
4. Adaptar componentes al tema alternativo

### Fase 3: Seguridad
1. Implementar encriptación de localStorage (AES)
2. Sistema de contraseña/PIN opcional
3. Validación y sanitización de inputs
4. Exportación/importación con cifrado

### Fase 4: Distribución
1. Optimizar build de producción
2. Script de empaquetado
3. Documentación de instalación
4. Landing page de descarga
5. Servidor de distribución

---

## 🚀 Comenzamos con...

**Fase 1: PWA** - Es la base fundamental que habilita instalación y offline-first.

¿Estás de acuerdo con este orden o prefieres empezar por otro aspecto?
