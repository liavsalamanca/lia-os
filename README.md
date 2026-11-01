# LIA OS — Your Life, Your System

Sistema operativo personal *local-first* para organizar tareas, proyectos, calendario, hábitos, finanzas, encargos USA, Taikinsa, las marcas Mariè y Dans Lia Vie, ideas, castings, investigación y diario.

- **Visión completa del producto:** [MASTER_PLAN.md](MASTER_PLAN.md)
- **Estado real por fases:** [docs/ROADMAP.md](docs/ROADMAP.md)

## Qué funciona hoy

Las 15 áreas de la versión anterior, ahora sobre una base mantenible:

- Overview, tareas con filtros, proyectos, calendario mensual, hábitos con rachas y Focus (25/50/5).
- Taikinsa Studio, Encargos USA con cotización en vivo, Mis marcas y Finanzas con metas de ahorro.
- Idea Vault, Modelaje, Investigación y Diario.
- Búsqueda global y comandos con Ctrl/Cmd+K, navegación adaptada a móvil y modo claro/oscuro.
- Exportar e importar respaldos JSON (también de la versión 1), con copia automática antes de reemplazar.
- PWA instalable que funciona sin conexión.

**Todavía no existen:** cuentas, sincronización entre dispositivos, recordatorios, conexión con bancos, Instagram o Google Calendar. La lista completa de pendientes está en el roadmap.

## Privacidad y datos

- Tus registros se guardan en IndexedDB **en este navegador y dispositivo**. No se envían a ningún servidor y no están en GitHub.
- Si borras los datos del sitio o cambias de dispositivo, puedes perderlos. **Exporta respaldos con frecuencia** y guárdalos en privado.
- Nunca subas un respaldo al repositorio: es público.
- La aplicación no tiene cifrado propio. No guardes contraseñas en ella.

### Actualización desde la versión 1

Al abrir esta versión, tus datos de `lia-os-v1` se **copian** a la base nueva. La clave original no se modifica: queda como copia de seguridad y puedes descargarla o borrarla en Configuración → Versión anterior.

## Desarrollo

Requiere Node.js LTS.

```bash
npm install
```

```bash
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run typecheck` | Comprueba TypeScript |
| `npm test` | Pruebas unitarias y de integración (Vitest) |
| `npm run test:e2e` | Pruebas en navegador (Playwright: escritorio, móvil e iPhone) |

La primera vez, instala los navegadores de prueba con `npx playwright install chromium webkit`.

La prueba de actualización real desde la versión 1 necesita una copia de esa versión. Sin `V1_DIR` se omite:

```bash
V1_DIR=/ruta/a/v1 npm run test:e2e -- upgrade --project=escritorio
```

### Estructura

```text
src/
  app/      shell, tienda de estado, diálogos y comandos
  data/     esquemas, repositorio IndexedDB, migración y respaldos
  design/   componentes accesibles reutilizables
  domain/   lógica pura: cotización, fechas, hábitos, finanzas, búsqueda
  modules/  una página por área, registrada en modules/registry.ts
tests/      pruebas end-to-end
```

Para añadir un área: define su esquema en `src/data/schema.ts`, sus campos en `src/modules/collections.ts`, crea su página y regístrala en `src/modules/registry.ts`.

## Publicación

GitHub Actions publica en GitHub Pages cada cambio en `main`. La ruta base es `/lia-os/` y se cambia con `VITE_BASE`.

**Requisito único:** en GitHub, Settings → Pages → Build and deployment → Source debe estar en **GitHub Actions**.

### Usar en iPhone o iPad

Abre la URL en Safari y elige **Compartir → Añadir a pantalla de inicio**.

## Licencia

Uso personal.
