# Roar Studio Choice Awards 2026 · Invitación

Archivos que se publican (van en la raíz del repositorio `ROAR-choice-awards-2026`):

- `index.html`: la invitación completa (diseño, textos, logos, imagen del dress code y datos cifrados de los invitados).
- `og-image.jpg`: la imagen que muestra WhatsApp al compartir el enlace.

`enlaces-invitados.csv` **no se publica**: es la lista privada de enlaces personales.

## Publicar en GitHub Pages

1. Abre el repositorio `ROAR-choice-awards-2026` en GitHub.
2. **Add file › Upload files**, arrastra `index.html` y `og-image.jpg` (reemplazan a los actuales) y pulsa **Commit changes**.
3. Si Pages aún no está activo: **Settings › Pages › Deploy from a branch › main › / (root) › Save**.
4. En uno o dos minutos estará en <https://liavsalamanca.github.io/ROAR-choice-awards-2026/>.

Cada invitado abre su enlace personal: `…/ROAR-choice-awards-2026/?i=CODIGO`. Sin código (o con uno que no existe) se ve la versión general, sin datos de nadie.

## Cambiar un texto

1. En GitHub abre `index.html` y pulsa el lápiz (**Edit this file**).
2. Al inicio está la sección `CONFIG · DATOS EDITABLES`. Cambia solo lo que está entre comillas.
3. **Commit changes**.

## Cambiar un tamaño de letra

1. En el mismo archivo busca (Ctrl/Cmd + F) `MIS AJUSTES`.
2. Cada línea tiene `clamp(mínimo, ideal, máximo)`: el primer número es el tamaño en celular y el último en pantallas grandes. Ejemplo: `--tam-nombre` es el nombre del invitado.
3. **Commit changes**.

## Cambiar una imagen

Sube el archivo junto a `index.html` (por ejemplo `dress-code.webp`) y escribe su nombre en `CONFIG › imagenes`:

```js
dressCode: "dress-code.webp",
```

Los nombres previstos son `logo-roar.webp`, `logo-choice-awards.webp` y `dress-code.webp`.

## Invitados

Los nombres no están en el código: cada registro va cifrado (AES-GCM) con una clave derivada del código privado de su enlace. Para agregar, quitar o corregir invitados hay que volver a generar el bloque cifrado y el CSV; no se puede hacer a mano.
