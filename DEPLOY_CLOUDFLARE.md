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

## Notas técnicas
- `frontend/public/_redirects` contiene `/* /index.html 200` para que las rutas de la SPA
  (`/canciones/himnos/tierra/legion`, `/lemas/tierra`, …) funcionen al recargar o compartir enlaces.
- El paso `prebuild` regenera `frontend/public/sitemap.xml` a partir del archivo musical, incluidas las
  fichas de canciones e himnos; `frontend/public/robots.txt` publica la URL del sitemap.
- Los metadatos sociales, la URL canónica y los datos estructurados de identidad se definen en
  `frontend/public/index.html`; la aplicación actualiza el título y la URL canónica al navegar.
- La hoja de Google Fonts se precarga sin bloquear el renderizado y el script externo de Emergent usa `async`.
- `frontend/public/_headers` configura HSTS, CSP y otras cabeceras de seguridad para Cloudflare Pages.
- La ruta `/privacidad-cookies` publica la política y el banner bloquea PostHog hasta aceptar; el pie permite
  cambiar la elección. La política debe revisarse con los datos legales y plazos definitivos antes de producción.
- Los ~88 MB de audio e imágenes en `frontend/public/assets` se publican tal cual (95 archivos; el mayor
  pesa < 25 MB, límite por archivo de Pages).
- Para una build local: `cd frontend && REACT_APP_STATIC=true yarn build` → carpeta `frontend/build`,
  que también puede arrastrarse a Pages con **Upload assets** (Direct Upload).
