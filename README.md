# Wuf! accesorios

Sitio web de **Wuf! accesorios**, collares de paracord tejidos a mano en Chihuahua.

Es un sitio estático: solo HTML, CSS, JavaScript e imágenes. No necesita compilarse ni instalar nada.

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Página de inicio: collares, carta de colores y cómo pedir |
| `personaliza.html` | Arma tu collar: medida, colores, nombre, plaquita solidaria y envío, con vista previa en vivo y total |

## Estructura

```
index.html
personaliza.html
assets/
  js/runtime.js   ← motor pequeño que pinta las páginas a partir de su plantilla
  img/            ← fotos, logo, carta de colores y máscaras para recolorear
```

Cada página tiene su contenido dentro de `<template id="tpl">` y su lógica al final, en la clase `Component`.

## Inventario (Google Sheets)

Los cordones y los estilos de letra se manejan en la hoja **Inventario Wuf!** de Google Drive, sin tocar el código:

- **Cordones:** desmarcar *Disponible* oculta el color en las dos páginas. Un color nuevo necesita su *Tono para la vista previa* (#RRGGBB) y, de preferencia, un enlace a su foto en Drive.
- **Estilos de letra:** nombre, precio por letra, disponibilidad y descripción. Las fotos de cada estilo están en `assets/img/letras_*.jpg` (se emparejan por nombre; si pones un enlace en la columna Foto, se usa ese).

La hoja debe estar compartida como **Cualquier persona con el enlace: Lector**. El ID de la hoja está en `assets/js/inventario.js`. Si la hoja no se puede leer, las páginas usan la lista de respaldo que traen dentro (`BASE` en `personaliza.html`).

## Cambios frecuentes

En `personaliza.html`, dentro de la clase `Component`:

- **Precios de tallas:** `var SIZES = [['CH','20–28 cm',170], ...]`
- **Precio de la placa:** `var PLACA = 180;`
- **Lista de respaldo de colores:** `BASE`. Va en el mismo orden que la carta `assets/img/sprite.jpg`.
- **Precios de envío por zona:** el último renglón del script, `mountPage(Component, {"zona1": 30, ...})`
- **Zonas y distancias:** la lista `ZONES`

## Publicar en Netlify

1. Entra a [app.netlify.com](https://app.netlify.com) y crea una cuenta. Puedes entrar con GitHub.
2. Elige **Add new site → Import an existing project → GitHub** y selecciona `wuf-accesorios`.
3. Deja vacíos *Build command* y *Publish directory*, o pon `.`, y publica.
4. Cada cambio que se suba a `main` se publica solo.

## Probar en tu computadora

```
python3 -m http.server 8000
```

y abre http://localhost:8000
