# Roar Studio · Clausura 2026 — invitación digital (prototipo)

Página independiente en HTML, CSS y JavaScript sin dependencias ni compilación. No forma parte de la aplicación LIA OS.

## Cómo abrirla

- Abre `index.html` directamente en el navegador, o
- sirve la carpeta: `npx serve roar-clausura-2026` (o `python3 -m http.server` dentro de la carpeta).

## Archivos

| Archivo | Contenido |
|---|---|
| `data.js` | **Todos los datos editables**: evento, ubicación, dress code, marcas, programa, aliados, moodboard e invitaciones de demostración. Un `null` se muestra como "por confirmar". |
| `app.js` | Lógica: invitaciones, confirmaciones, moodboard, paneles de marcas, calendario, cuenta regresiva, navegación y panel de demostración. |
| `styles.css` | Diseño (tokens de color y tipografía al inicio). |
| `assets/` | Logos de Roar Studio. `roar-choice-awards-2026.png` se guarda pero no se usa todavía. |

## Panel "Solo demostración"

Botón fijo en la esquina inferior izquierda. Permite ver la página como:

1. Modelo con invitación individual.
2. Modelo con acompañante autorizado (con el nombre del acompañante pendiente).
3. Representantes de una marca invitada (ejemplo ficticio con 2 accesos).

Las respuestas se guardan solo en `localStorage` de ese navegador. "Restablecer demostración" las borra.

## Completar datos pendientes (en `data.js`)

- `brands[]`: nombre, logo, colección, imagen, descripción, Instagram; quitar `placeholder: true`.
- `runway[]`: orden (y hora, si se confirma) de cada pasarela.
- `sponsors[]`: la sección "Patrocinadores y aliados" aparece sola al tener contenido.
- `moodboard[].image`: fotografías de referencia propias.
- `event.contact`, `event.rsvpDeadlineLabel`, `event.dressCode.publicGuideUrl`, `event.accessControl`.

## Para pasar a producción

- Reemplazar `InvitationService` (en `app.js`) por llamadas a un servidor: cada enlace privado lleva un identificador no predecible y el servidor devuelve **solo** esa invitación.
- El servidor valida cupos (`seats`), qué lugares admiten nombre y cada respuesta. La interfaz no decide nada.
- Quitar `demoInvitations` de `data.js` y el bloque `#demo` de `index.html`.
- Guardar las respuestas en una base de datos compartida y crear un panel administrativo protegido.
- Definir el control de ingreso antes de mostrar cualquier credencial o código.
