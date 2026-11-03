# LIA OS — Roadmap

Estado real del desarrollo. La visión completa está en [MASTER_PLAN.md](../MASTER_PLAN.md).

Una casilla se marca solo cuando su verificación se ejecutó y pasó. Un módulo se considera terminado únicamente según la sección 12 del Master Plan.

**Estado actual:** Fase 1 publicada en GitHub Pages. La sincronización de la Fase 3 se adelantó y está implementada, pendiente de conectarla a un proyecto Supabase real. Ningún módulo está terminado según la sección 12: las 15 áreas conservan la funcionalidad de v1 y su ampliación corresponde a las fases siguientes.

---

## 1. Auditoría de la versión actual (v1)

**Stack:** HTML, CSS y JavaScript sin dependencias, sin build y sin pruebas. Toda la lógica está en `assets/app.js` (110 líneas muy densas, 54 KB) y `assets/styles.css`.

**Publicación:** repositorio público `liavsalamanca/lia-os`, con GitHub Pages activo. Los archivos locales coinciden en nombre y tamaño con `main`.

**Datos:** un solo objeto JSON en `localStorage`, clave `lia-os-v1`, `version: 1`.

| Colección | Campos principales |
|---|---|
| `settings` | `name`, `theme`, `portfolio`, `focusMinutes`, `shippingRate`, `fx` |
| `tasks` | `title`, `area`, `priority`, `status`, `due`, `projectId`, `notes` |
| `projects` | `name`, `area`, `status`, `progress`, `deadline`, `notes` |
| `events` | `title`, `date`, `time`, `area`, `notes` |
| `habits` + `habitLogs` | `name`, `area`, `notes`; `habitLogs` es `{ habitId: [fechas] }` |
| `transactions` | `kind`, `amount`, `description`, `date`, `area`, `category`, `notes` |
| `goals` | `name`, `target`, `current`, `deadline` |
| `orders` | `client`, `item`, `store`, `status`, `priceUSD`, `shippingUSD`, `weightLb`, `shippingRate`, `extraUSD`, `fx`, `marginPercent`, `notes` |
| `products` | `name`, `brand`, `stock`, `costCOP`, `priceCOP`, `notes` |
| `content` | `title`, `format`, `platform`, `status`, `publishDate`, `notes` |
| `ideas` | `title`, `area`, `type`, `status`, `link`, `description` |
| `castings` | `brand`, `type`, `date`, `status`, `feeCOP`, `notes` |
| `sources` | `title`, `author`, `status`, `link`, `insight` |
| `journal` | `title`, `date`, `mood`, `entry` |

**Funciona y debe conservarse (15 vistas):** Overview, Mis tareas, Calendario mensual, Proyectos, Hábitos con rachas, Focus (25/50/5), Taikinsa Studio, Encargos USA, Mis marcas, Finanzas, Idea Vault, Modelaje, Investigación, Mi diario y Configuración. También la búsqueda global con Ctrl/Cmd+K, tema claro/oscuro, exportar e importar JSON, plantillas, borrado local con doble confirmación y la PWA instalable.

### Problemas encontrados

| # | Gravedad | Dónde | Problema |
|---|---|---|---|
| 1 | Alta | `app.js:12` | Si el JSON guardado no se puede leer, la app arranca vacía y el siguiente guardado sobrescribe los datos originales. |
| 2 | Alta | `app.js:92` | Importar reemplaza todos los datos sin respaldo previo y solo valida que existan `tasks`, `projects` y `settings`. |
| 3 | Alta | `app.js:45`, `app.js:52` | `data-habit-toggle="${h.id}"` no escapa el id. Un respaldo importado y manipulado podría inyectar HTML (XSS). |
| 4 | Media | `app.js:53` | `num(o.shippingRate \|\| db.settings.shippingRate)` ignora una tarifa de 0 y aplica la predeterminada. Lo mismo ocurre con `fx`. Da una cotización errónea. |
| 5 | Media | `app.js:18` | `today()` usa la zona horaria del dispositivo, no la de Colombia. |
| 6 | Media | `app.js:83` | Las etiquetas de formulario no están asociadas a sus campos (sin `for`). Los modales no retienen el foco. |
| 7 | Media | `sw.js` | La versión de caché es fija, y sin conexión solo responde a coincidencias exactas de URL. |
| 8 | Baja | `app.js:55` | `db.content.sort` altera los datos durante el renderizado. |
| 9 | Baja | `app.js:96-101` | Abrir un resultado de búsqueda lleva a la página, pero no al registro. |
| 10 | Baja | `index.html:13` | Google Fonts se carga de un tercero: filtra visitas y no funciona sin conexión. |
| 11 | Baja | `.gitignore` | `.env*` también ignoraría `.env.example`; hay que añadir la excepción `!.env.example`. |

---

## 2. Decisiones de arquitectura

| Tema | Decisión | Motivo |
|---|---|---|
| Frontend | React, TypeScript estricto, Vite, Tailwind | El stack propuesto encaja; no hay razón para cambiarlo. |
| Rutas | `HashRouter` | GitHub Pages no reescribe rutas, y con hash recargar nunca da 404. Los enlaces antiguos (`#tasks`) se redirigen a `#/tasks`. |
| Persistencia | Interfaz asíncrona `Repository`, con adaptador IndexedDB en Fase 1 y Supabase en Fase 3 | Si es asíncrona desde el principio, añadir la nube no obliga a reescribir los módulos. IndexedDB además admite más datos que `localStorage`. |
| Datos v1 | La clave `lia-os-v1` se lee y nunca se modifica ni se borra | Migración copiando, idempotente y reversible. La v1 sigue siendo la copia de seguridad. |
| Migraciones | Esquemas Zod versionados y migraciones numeradas puras | Se pueden probar con fixtures. |
| Registros | Módulos declarativos: esquema, campos y vistas por colección | Da CRUD, validación, búsqueda y orden comunes, y permite añadir áreas sin reconstruir. |
| Lógica de negocio | Funciones puras en `src/domain`, sin React | Es lo que exige la sección 6 y se prueba con facilidad. |
| Fechas | Fechas calculadas en `America/Bogota`, configurable | Corrige el problema 5. |
| PWA | `vite-plugin-pwa` (Workbox) con precaché versionada | Reemplaza `sw.js` y corrige el problema 7. |
| Fuentes | Autoalojadas con `@fontsource` | Corrige el problema 10. |
| Base | `VITE_BASE`, por defecto `/lia-os/` | Configurable, como pide el Master Plan. |

**Estructura prevista:**

```text
src/
  app/        shell, rutas, proveedores, comando Ctrl+K
  design/     tokens y componentes accesibles (Button, Dialog, Field, Table…)
  data/       Repository, adaptadores, migraciones, respaldo
  domain/     lógica pura (cotización, rachas, fechas, finanzas)
  modules/    un directorio por módulo, registrado en src/modules/registry.ts
tests/        e2e con Playwright y fixtures v1 sin datos reales
```

---

## 3. Mapa de módulos

| # | Módulo | Hoy (v1) | Fase |
|---|---|---|---|
| 01 | Home / Life Dashboard | Parcial | 1 paridad, 2 completo |
| 02 | Tasks & Projects | Parcial | 1 paridad, 2 completo |
| 03 | Calendar | Parcial (solo mes) | 1 paridad, 2 completo |
| 04 | Focus | Parcial | 1 paridad, 7 completo |
| 05 | Finanzas | Parcial (solo COP) | 1 paridad, 4 completo |
| 06 | USA Orders | Parcial (calculadora) | 1 paridad, 4 completo |
| 07 | Taikinsa Studio | Parcial (pipeline) | 1 paridad, 4 completo |
| 08 | Jewelry | Parcial (inventario) | 1 paridad, 4 completo |
| 09 | Modeling | Parcial (castings) | 1 paridad, 5 completo |
| 10 | Fashion Atelier | No existe | 5 |
| 11 | University & Research | Parcial (fuentes) | 1 paridad, 5 completo |
| 12 | Wellness & Routines | Parcial (hábitos) | 1 paridad, 6 completo |
| 13 | Idea Vault | Parcial | 1 paridad, 5 completo |
| 14 | Journal | Parcial | 1 paridad, 6 completo |
| 15 | Goals & Dreams | Parcial (ahorro) | 1 paridad, 6 completo |
| 16 | Closet Sale | No existe | 6 |
| 17 | Settings & Data | Parcial | 1 paridad, 2 y 3 completo |

---

## 4. Fases y tareas verificables

### Fase 1 — Auditoría y arquitectura (un PR)

- [x] Auditoría del repositorio y de los datos. *Verificación: sección 1 de este documento.*
- [x] `MASTER_PLAN.md` y este roadmap.
- [x] Node, Git y GitHub CLI disponibles. *Verificación: `node -v`, `git --version`, `gh auth status`.*
- [x] Vite, React y TypeScript estricto en la rama `feat/fase-1-arquitectura`. *Verificación: `npm run typecheck` y `npm run build`.*
- [x] `Repository` con adaptador IndexedDB. *Verificación: pruebas de guardado y recuperación.*
- [x] Migración v1 a v2 copiando datos. *Verificación: pruebas con fixture; repetirla no duplica y `lia-os-v1` queda idéntica byte a byte.*
- [x] Lectura segura de datos corruptos, sin sobrescribir (problema 1). *Verificación: prueba unitaria.*
- [x] Importación con esquema y respaldo automático previo (problema 2). *Verificación: prueba con archivo inválido.*
- [x] Sistema de diseño con tema claro/oscuro. *Verificación: revisión en navegador en 375 px y 1440 px.*
- [x] Shell: sidebar, navegación móvil, búsqueda y command palette. *Verificación: e2e con teclado.*
- [x] Las 15 vistas con paridad funcional. *Verificación: e2e de crear, editar y eliminar en cada colección.*
- [x] Cálculo de cotización portado, con pruebas y corrección del problema 4. *Verificación: pruebas unitarias con los resultados de v1 como referencia.*
- [x] PWA con precaché versionada y sustitución limpia del `sw.js` anterior. *Verificación: build e instalación con actualización desde v1 en navegador.*
- [x] GitHub Actions: pruebas, build y despliegue a Pages. *Verificación: CI en verde en el PR y primer despliegue tras fusionar.*
- [x] README actualizado. `PROMPT_CLAUDE.md` se conserva como referencia histórica; este documento lo sustituye.

**Antes de fusionar este PR:** hay que cambiar Settings → Pages → Source a **GitHub Actions**. Pages publica hoy `main` desde la raíz; si no se cambia, publicaría el `index.html` de desarrollo y la app quedaría en blanco.

### Fase 2 — Core

- [ ] Dashboard con widgets configurables y ordenables.
- [x] Tareas: subtareas, etiquetas, recurrencia, dependencias, recordatorios y vistas inteligentes. *Verificación: `tasks.test.ts` y `tasks.spec.ts`. Los recordatorios suenan solo con la app abierta: no hay servidor de notificaciones push.*
- [ ] Vistas Kanban (arrastrar y soltar), lista, calendario y prioridad; filtros avanzados. *Hecho: filtros por prioridad y etiqueta.*
- [ ] Proyectos con hitos y avance.
- [ ] Calendario semanal, diario y time blocking.
- [ ] Configuración: perfil, moneda, zona horaria y notificaciones.
- [x] Autenticación con correo y contraseña, recuperación por código y cierre de sesión; el modo local sigue siendo el predeterminado.

### Fase 3 — Datos y sincronización

- [x] Migraciones SQL versionadas y RLS por usuario. *Verificación: `rls.test.ts` ejecuta el SQL real en PostgreSQL embebido. Falta repetirla en el proyecto real.*
- [x] Motor de sincronización local-first con adaptador de Supabase. *Verificación: `sync.test.ts` y `cloud.spec.ts` con Supabase simulado. Falta probarlo en el proyecto real.*
- [ ] Supabase Storage privado para adjuntos.
- [x] Migración voluntaria e idempotente a la nube, con copia automática previa.
- [x] Sincronización, resolución de conflictos (gana el cambio más reciente) y respaldos.
- [x] Sincronización automática en tiempo real con Supabase Realtime, respetando RLS, y revisión de respaldo cada 15 s. *Verificación: `cloud.spec.ts` con un Realtime simulado; la prueba falla si se quita el aviso. Requiere ejecutar `20261103000000_records_realtime.sql` en el proyecto real.*
- [x] Guía de configuración en [docs/SUPABASE.md](SUPABASE.md).
- [ ] Conectar el proyecto real. *Requiere de ti: crear el proyecto Supabase y entregar URL y clave publishable.*

### Fase 4 — Business Suite

- [ ] Encargos USA completo: clientes, catálogo, anticipos, saldos, consolidación, IVA configurable, PDF, WhatsApp, panel y alertas, con cálculos probados.
- [ ] Taikinsa Studio completo: calendario editorial, campañas, shot lists, aprobación, métricas manuales y reportes, sin simular integraciones.
- [ ] Marcas: inventario, SKU, colecciones, ventas, garantías y rentabilidad por producto y colección.
- [ ] Finanzas: cuentas, COP y USD, presupuestos, transferencias, recurrentes, reportes y separación entre personal y negocios.

### Fase 5 — Creative Suite

- [ ] Modelaje: perfil, medidas, agencias, contratos, comp card descargable y página pública separada de lo privado.
- [ ] Fashion Atelier: colecciones, moodboards, fichas técnicas exportables, costos y cronogramas.
- [ ] University & Research: materias, entregas, gestor de referencias, encuestas y seguimiento del trabajo de grado.
- [ ] Idea Vault: imágenes, etiquetas, relaciones, favoritos y conversión en proyecto o tarea.

### Fase 6 — Personal Suite

- [ ] Wellness: rutinas AM/PM, skincare, haircare, ejercicio, hidratación, sueño y energía, sin diagnósticos.
- [ ] Diario: gratitud, revisión mensual, preguntas y búsqueda por fecha.
- [ ] Metas por plazo, hitos, wishlist y vision board, relacionadas con proyectos y tareas.
- [ ] Closet Sale: catálogo, canales, compradores, pagos y generador de fichas.

### Fase 7 — Automatización

- [ ] Reglas deterministas: vencidas, proyectos detenidos, resumen semanal y prioridades sugeridas.
- [ ] Focus completo: estadísticas, sonidos con licencia, planificación y revisión semanal.
- [ ] Google Calendar con OAuth y consentimiento explícito.
- [ ] Funciones de IA a través de backend, nunca con claves en el navegador.

### Fase 8 — QA y publicación

- [ ] Suite e2e de la sección 10 en móvil y escritorio.
- [ ] Auditoría de accesibilidad y rendimiento.
- [ ] Revisión de seguridad.
- [ ] Verificación final en la URL real de GitHub Pages.

---

## 5. Resultado de la Fase 1

Problemas de la auditoría corregidos: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 y 11.

- **Cambio de comportamiento:** un casillero de 0 en un pedido ahora se respeta. En v1 se reemplazaba por la tarifa predeterminada, así que un pedido antiguo guardado con 0 mostrará un precio menor.
- **Decisión sobre actualizaciones:** el service worker se activa solo y no recarga la página, para no perder un formulario abierto.
- **Recharts** no se instaló: se añade en la Fase 4, cuando exista el primer gráfico.
- **Verificado tras publicar:** despliegue en GitHub Pages y uso en dos dispositivos reales, según confirmación de la usuaria.
- La prueba de actualización desde v1 se ejecutó localmente y necesita `V1_DIR`, por lo que CI la omite.

---

## 6. Lo que te corresponde a ti

| Cuándo | Qué |
|---|---|
| Antes de fusionar la Fase 1 | Cambiar Pages a GitHub Actions. |
| Fase 3 | Crear el proyecto Supabase. |
| Fase 7 | Crear las credenciales OAuth de Google. |
