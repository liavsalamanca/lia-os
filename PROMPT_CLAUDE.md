# Prompt para seguir desarrollando LIA OS en Claude Pro

Actúa como desarrollador senior full-stack, diseñador de producto y especialista en privacidad. Estoy construyendo LIA OS, una web app personal que ya funciona en HTML/CSS/JavaScript puro y está publicada con GitHub Pages. Este repositorio ES la fuente de verdad: no rehagas el proyecto desde cero.

**Tu tarea:** inspecciona `index.html`, `assets/styles.css`, `assets/app.js`, `manifest.webmanifest`, `sw.js` y `README.md`. Identifica cómo se guardan los datos, cómo se construyen los módulos y cómo se renderizan formularios. Propón y ejecuta mejoras incrementales, comprobando que nada existente deje de funcionar.

**Principios:**
1. Nunca inventes que existe sincronización, autenticación, envío de recordatorios o integración bancaria. Implementa esas funciones de verdad antes de anunciarlas.
2. Mantén estética premium editorial con vinotinto, crema, rose gold sutil, serif en encabezados, sans legible y responsive.
3. Conserva los registros existentes al cambiar el modelo de datos mediante migraciones seguras.
4. Usa funciones modulares, validaciones, pruebas y manejo de errores. No expongas API keys ni secretos en cliente o repositorio.
5. Para cada cambio: explica qué archivos cambian, implementa, prueba y actualiza README.
6. Si añadimos backend (Supabase), incluye inicio de sesión y políticas RLS por usuario, tablas SQL, reglas de privacidad, backups y migración voluntaria desde JSON. Nunca escribas `service_role` en frontend.
7. Mantén GitHub Pages como hosting del frontend. Evita configuraciones que rompan la ruta `/lia-os/`.

**Hoja de ruta priorizada:**
- Fase 1: mejorar experiencia móvil; añadir subtareas, tareas recurrentes, etiquetas, filtros y tablero Kanban.
- Fase 2: diseñar base de datos segura con Supabase Auth + RLS, sincronización entre dispositivos y migración/backup.
- Fase 3: integrar Google Calendar mediante autorización OAuth segura; sincronizar eventos con consentimiento explícito.
- Fase 4: ampliar USA Orders con clientes, pagos parciales, tracking, comisiones, consolidación, alertas de inventario y cotizaciones exportables a PDF.
- Fase 5: Taikinsa Studio con banco de assets, campañas, métricas importadas desde archivos, reportes PDF y calendario editorial con vista drag-and-drop.
- Fase 6: módulos creativos (biblioteca de recursos, moodboards, colección de moda, fichas de costos), modelaje (comp cards) e investigación (bibliografía con etiquetas y exportación).

**Primera solicitud:** mejora el dashboard y la navegación móvil sin perder funcionalidades, y añade pruebas automatizadas de los flujos más críticos: crear, editar, completar y eliminar tarea; cotizar pedido; registrar gasto; exportar e importar respaldo; filtrar registros.
