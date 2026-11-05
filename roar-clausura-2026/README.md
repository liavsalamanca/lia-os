# Roar Studio Choice Awards 2026 — invitación digital

Página independiente en HTML, CSS y JavaScript, sin dependencias ni compilación. Se publica junto a LIA OS en GitHub Pages, pero no forma parte de la aplicación.

**Dirección pública:** https://liavsalamanca.github.io/ROAR-choice-awards-2026/

## Enlace personalizado

Agrega `?para=` con el nombre del invitado para que la portada y la invitación lo saluden:

```
https://liavsalamanca.github.io/ROAR-choice-awards-2026/?para=Lia%20Salamanca
```

Los espacios se escriben como `%20`. El nombre es solo un saludo: no da acceso ni define cupos.

## Confirmación de asistencia

No hay servidor. El invitado escribe su nombre y toca **Confirmar asistencia** o **No podré asistir**; se abre WhatsApp con el mensaje listo para Héctor Carrillo (+57 316 536 8405). La confirmación queda registrada cuando el invitado envía ese mensaje. La página solo recuerda, en ese navegador, qué respuesta preparó.

## Archivos

| Archivo | Contenido |
|---|---|
| `data.js` | Datos editables: evento, ubicación, dress code, contacto y marcas. Un `null` se muestra como "por confirmar". |
| `app.js` | Lógica: portada y telón, confirmación por WhatsApp, calendario, cuenta regresiva, navegación y luz del hero. |
| `styles.css` | Diseño. |
| `assets/` | Logos y referencia del dress code en WebP, texturas del telón (`velvet.webp`, `valance.webp`), imagen para vista previa en WhatsApp (`og-image.jpg`) y favicon. |

## Publicación

El flujo `.github/workflows/deploy.yml` copia esta carpeta dentro de `dist/` en cada push a `main`. `vite.config.ts` excluye la ruta del worker de LIA OS para que no la intercepte.

Para ver la página en local, abre `index.html` en el navegador o sirve la carpeta con `npx serve roar-clausura-2026`.

## Marcas en pasarela

Cuando se confirmen, completa `brands[]` en `data.js` con el nombre y quita `placeholder: true`. La mención de la página mostrará los nombres sola.

## Rendimiento

- Las texturas del terciopelo y la cenefa son imágenes WebP pequeñas (antes se dibujaban en cada visita).
- Las fuentes cargan sin bloquear el primer dibujo; Raleway y Great Vibes solo con las letras que se usan.
- El logo principal se precarga; el resto de imágenes se cargan de forma diferida.
- La luz del hero solo se anima mientras está en pantalla.
