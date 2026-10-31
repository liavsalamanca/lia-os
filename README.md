# LIA OS — Your Life, Your System

Aplicación personal *local-first* para administrar tareas, proyectos, calendario, hábitos, finanzas, encargos USA, contenido de Taikinsa, inventario de Mariè / Dans Lia Vie, ideas, castings, investigación, diario y sesiones de concentración.

## Qué incluye
- **Dashboard Overview:** métricas, prioridades, agenda próxima y acceso rápido a tus espacios.
- **Mis tareas y proyectos:** estados, prioridades, fechas y vinculación entre tareas y proyectos.
- **Calendario:** tareas, eventos, castings y publicaciones en una vista mensual.
- **Hábitos:** seguimiento diario con rachas y últimos siete días.
- **Focus mode:** temporizadores 25/50/5 minutos.
- **Taikinsa Studio:** registro de contenidos, formatos, canales y pipeline de producción.
- **Encargos USA:** cotizaciones con peso exacto por libra, tarifa configurable, tasa USD/COP, costos adicionales y porcentaje de margen.
- **Mis marcas:** referencias, stock, precios, costos e inventario por marca.
- **Finanzas:** ingresos, gastos, balance mensual y metas de ahorro.
- **Idea Vault:** archivo creativo con referencias.
- **Modelaje:** pipeline de castings y enlace a book.
- **Investigación:** biblioteca de fuentes del proyecto de grado.
- **Mi diario:** reflexiones y estados de ánimo.
- **Configuración:** tema claro/oscuro, exportar/importar JSON, plantillas y borrado local.
- Diseño adaptable a móvil, tablet y computador, PWA instalable y caché básica offline.

## Publicar GRATIS con GitHub Pages (sin instalación ni compilación)

1. Descomprime `lia-os.zip`.
2. En [GitHub](https://github.com/new), crea un repositorio público llamado **lia-os** (no generes README automático si vas a subir todos los archivos).
3. En tu repositorio, pulsa **Add file → Upload files** y arrastra **el contenido de la carpeta** `lia-os` (no el ZIP ni la carpeta contenedora). Es importante que `index.html` quede en la raíz.
4. Confirma los cambios (**Commit changes**).
5. Abre **Settings → Pages → Build and deployment**. En **Source**, elige **Deploy from a branch**; escoge `main` y la carpeta `/(root)`; guarda.
6. Tu web quedará disponible en `https://TU-USUARIO.github.io/lia-os/` (sustituye `TU-USUARIO`). La publicación puede tardar un momento. En GitHub, Settings → Pages mostrará la URL exacta.
7. Cada vez que actualices los archivos en `main`, GitHub Pages publicará la nueva versión automáticamente. No hace falta configurar GitHub Actions ni instalar Node.js.

> Una URL de GitHub del tipo `github.com/usuario/lia-os` muestra el repositorio, no la web. GitHub Pages es la URL `usuario.github.io/lia-os/`.

## Usar en el iPhone/iPad

Abre la URL en Safari y elige **Compartir → Añadir a pantalla de inicio**. LIA OS se abrirá como experiencia tipo app. En computador puedes abrir la URL en Chrome o Edge e instalarla cuando el navegador muestre esa opción.

## Probar en computador sin GitHub

Al ser HTML/CSS/JavaScript sin dependencias, puedes abrir `index.html`, pero para probar la caché offline y PWA es mejor usar un servidor local:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

## ⚠️ Privacidad y persistencia de datos

- El **código** y los archivos subidos a un repositorio público son visibles para cualquiera. **Nunca subas tus respaldos de datos**, datos bancarios, credenciales ni secretos al repositorio.
- Los registros de LIA OS se guardan en `localStorage` **del navegador/dispositivo**, no en GitHub. No se sincronizan entre iPhone, iPad y computador.
- No tiene login, protección criptográfica, conexión bancaria, sincronización en la nube ni copias automáticas.
- Si borras la información del sitio, usas modo incógnito o cambias de navegador/dispositivo, puedes perder acceso a esos registros.
- **Exporta un respaldo JSON con frecuencia** (Configuración → Exportar respaldo) y guárdalo de forma privada. Para moverlo a otro dispositivo, utiliza Importar.
- GitHub Pages es hosting estático. Para sincronización real privada, fase 2 debe integrar autenticación y base de datos con políticas de acceso por usuario (ej., Supabase Auth + RLS).
- No uses el diario para almacenar contraseñas o información altamente sensible.

## Personalizar con Claude Pro

El código está organizado en `assets/app.js` (funciones y datos) y `assets/styles.css` (estética). Abre tu repositorio con Claude Code y usa las ideas de `PROMPT_CLAUDE.md` para ampliarlo sin romper la versión actual.

## Licencia

Uso personal. Puedes modificar y adaptar tu copia.
