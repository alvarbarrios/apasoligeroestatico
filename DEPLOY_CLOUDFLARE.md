# Publicar A Paso Ligero en Cloudflare Pages

El frontend (`/frontend`) se puede publicar como sitio estático en Cloudflare Pages.
Hay **dos modos**, elegidos con una variable de entorno en el momento de construir:

| Modo | Variables de build | Qué funciona |
|---|---|---|
| **Estático puro** | `REACT_APP_STATIC=true` | Todo el archivo (canciones, himnos, corneta, cornetín, audios, lemas, enlaces, búsqueda, hojas imprimibles, lema del día compartible). Contacto abre el programa de correo (`mailto:`). El Libro de Visitas enlaza al libro externo original. Sin panel de autor ni canciones subidas desde el panel. |
| **Híbrido** | `REACT_APP_BACKEND_URL=https://<su-app>.emergent.host` | Igual que la web desplegada en Emergent: contacto con entrega real, libro de visitas nativo, panel de autor, canciones subidas desde el panel. El frontend vive en Cloudflare y las llamadas `/api/...` van al backend de Emergent (CORS ya está abierto). |

## 1. Subir el código a GitHub
En el chat de Emergent: **Save to GitHub** → elija repositorio y rama.

## 2. Crear el proyecto en Cloudflare Pages
Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → elija el repositorio.

Configuración de build:

| Campo | Valor |
|---|---|
| Framework preset | *Create React App* (o *None*) |
| Root directory | `frontend` |
| Build command | `yarn install --frozen-lockfile && yarn build` |
| Build output directory | `build` |

El proyecto fija Yarn Classic en `frontend/package.json` y conserva `frontend/yarn.lock`.
La instalación con `--frozen-lockfile` hace que Pages falle si el manifiesto y el lockfile
no coinciden, en lugar de resolver versiones distintas durante el despliegue.

Variables de entorno (Settings → Environment variables, **Production** y **Preview**):

| Variable | Valor |
|---|---|
| `NODE_VERSION` | `20` |
| `GENERATE_SOURCEMAP` | `false` |
| `CI` | `false` |
| `REACT_APP_STATIC` | `true` (modo estático) — **o bien** |
| `REACT_APP_BACKEND_URL` | `https://<su-app>.emergent.host` (modo híbrido, sin barra final) |

La build genera `sitemap.xml` desde el archivo estático de canciones y grupos, publica
`robots.txt` y crea HTML prerenderizado con título y metadatos Open Graph/canonical para cada
ruta estática. Esto permite que buscadores y previsualizadores sociales que no ejecutan
JavaScript reciban metadatos específicos. Las canciones dinámicas añadidas desde el panel
solo aparecen tras generar una nueva build cuando formen parte del archivo estático.
Canonical, Open Graph y sitemap usan `https://www.apasoligero.com`; si se elige otro dominio,
actualice esa URL en `frontend/public/index.html`, `frontend/src/hooks/useTitle.js`,
`frontend/scripts/generate-sitemap.js` y `frontend/public/robots.txt`.

Pulse **Save and Deploy**. En 2–4 minutos tendrá la URL `https://<proyecto>.pages.dev`.

## 3. Dominio propio
Pages → su proyecto → **Custom domains → Set up a custom domain** → `www.apasoligero.com`.
Si el DNS del dominio ya está en Cloudflare, el registro CNAME se crea solo.

La dirección raíz `apasoligero.com` también debe resolver para que los visitantes que omitan
`www` lleguen al sitio. En Cloudflare, añada el dominio raíz como zona y configure sus
nameservers en el registrador; una vez activa la zona, añada `apasoligero.com` como dominio
personalizado del proyecto Pages. Después, cree una regla de redirección permanente en
**Rules → Redirect Rules**: cuando el host sea `apasoligero.com`, redirija a
`https://www.apasoligero.com` conservando la ruta y la consulta. No cambie los nameservers
sin confirmar primero que los demás registros del dominio se han migrado.

## Notas técnicas
- `frontend/public/404.html` es la página 404 real de Pages; las rutas inexistentes no deben
  responder con la portada y estado 200. El generador de sitemap crea además reglas de
  reescritura para las rutas prerenderizadas y, en modo híbrido, para las rutas dinámicas que
  necesitan React (administración, firmas compartidas e incorporaciones del autor). Las reglas
  exactas de las rutas prerenderizadas van antes de las dinámicas para conservar sus metadatos SEO.
- El paso `prebuild` regenera `frontend/public/sitemap.xml` a partir del archivo musical, incluidas las
  fichas de canciones e himnos; `frontend/public/robots.txt` publica la URL del sitemap.
- Los metadatos sociales, la URL canónica y los datos estructurados de identidad se definen en
  `frontend/public/index.html`; la aplicación actualiza el título y la URL canónica al navegar.
- La hoja de Google Fonts se precarga sin bloquear el renderizado y el script externo de Emergent usa `async`.
- `frontend/public/_headers` configura HSTS, CSP y otras cabeceras de seguridad para Cloudflare Pages.
- Cloudflare Pages sirve actualmente `200 OK` incluso cuando se solicita un rango de bytes
  (`Range`) para un archivo estático; no se puede habilitar `206 Partial Content` con `_headers`.
  La Function `frontend/functions/assets/audio/[[path]].js` entrega rangos `206` desde R2 y
  deja pasar a los archivos estáticos mientras un MP3 todavía no exista en el bucket. Para
  activarla:
  1. Cree un bucket R2 llamado `apl-audio` (o adapte el nombre en los siguientes pasos).
  2. En **Workers & Pages → su proyecto Pages → Settings → Bindings**, añada un binding R2
     con nombre `APL_AUDIO_BUCKET` y asígnelo a ese bucket. Repítalo para Production y Preview;
     después, publique una nueva build.
  3. Desde `frontend`, ejecute `.\scripts\upload-audio-to-r2.ps1`. Requiere Node, `npx` y
     Wrangler autenticado con permisos de escritura en ese bucket. Use `-WhatIf` para previsualizar.
     El script conserva las rutas relativas, por ejemplo `corneta/diana.mp3`.
  Si el proyecto usa **Direct Upload**, el panel de arrastrar y soltar no compila Pages Functions;
  publique con Wrangler desde `frontend`: `npx wrangler pages deploy build --project-name <nombre-del-proyecto>`.
  Los proyectos conectados a Git siguen desplegándose con su build normal.
  `_routes.json` limita la invocación de Functions a `/assets/audio/*`; el resto del sitio
  continúa como estático. Los MP3 antiguos siguen de respaldo, así que se pueden subir sin
  interrupción. Compruebe al terminar con `curl -I -H "Range: bytes=0-3" https://www.apasoligero.com/assets/audio/himnonacional.mp3`:
  debe responder `206` y `Content-Range`. Solo añadir `Accept-Ranges` a la respuesta no implementa
  el soporte de rangos.
- La ruta `/privacidad-cookies` publica la política y el banner bloquea PostHog hasta aceptar; el pie permite
  cambiar la elección. La política debe revisarse con los datos legales y plazos definitivos antes de producción.
- Los ~88 MB de audio e imágenes en `frontend/public/assets` se publican tal cual (95 archivos; el mayor
  pesa < 25 MB, límite por archivo de Pages).
- Para una build local: `cd frontend && REACT_APP_STATIC=true yarn build` → carpeta `frontend/build`,
  que también puede arrastrarse a Pages con **Upload assets** (Direct Upload).
