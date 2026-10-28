/**
 * Prerender postbuild: renderiza cada ruta del sitemap en Chrome headless,
 * espera a que las animaciones de entrada terminen (scroll + settle) y guarda
 * el DOM final completo en el index.html de cada ruta (SSG visible).
 * Mismo HTML para usuarios y crawlers; sin contenido oculto.
 * Requiere: devDependency `puppeteer` (instala Chrome for Testing en CI).
 * PRERENDER=0 desactiva el paso (build rápido local). PRERENDER_CONCURRENCY=6.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

if (process.env.PRERENDER === "0") { console.log("prerender: desactivado (PRERENDER=0)"); process.exit(0); }

const BUILD = path.join(__dirname, "..", "build");
const CONCURRENCY = parseInt(process.env.PRERENDER_CONCURRENCY || "2", 10); // concurrencia alta deja las animaciones de montaje sin CPU y hornea contenido invisible
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".xml": "application/xml", ".txt": "text/plain", ".ico": "image/x-icon", ".woff2": "font/woff2" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(BUILD, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  if (!fs.existsSync(f)) f = path.join(BUILD, "index.html"); // SPA fallback
  try { res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f)); }
  catch (e) { res.writeHead(404); res.end(); }
});

(async () => {
  const sitemap = fs.readFileSync(path.join(BUILD, "sitemap.xml"), "utf8");
  const routes = [...sitemap.matchAll(/<loc>https:\/\/www\.apasoligero\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
  console.log(`prerender: ${routes.length} rutas`);

  const puppeteer = require("puppeteer");
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  let idx = 0, done = 0; const fails = []; const stuck = []; const allRoutes = [...routes];
  async function worker() {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    // No capturar analítica/telemetría de la sesión de build
    await page.setRequestInterception(true);
    page.on("request", (req) => { const u = req.url(); if (/posthog|emergent\.sh|googletagmanager|google-analytics/.test(u)) req.abort(); else req.continue(); });
    while (idx < routes.length) {
      const route = routes[idx++];
      try {
        await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "networkidle0", timeout: 45000 });
        // activar contenido diferido (whileInView) y esperar a que las animaciones terminen
        await page.evaluate(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 110)); } window.scrollTo(0, 0); });
        try { await page.waitForFunction(() => { for (const el of document.querySelectorAll("#root *")) { if (parseFloat(getComputedStyle(el).opacity) < 0.99) return false; } return true; }, { timeout: 25000, polling: 300 }); } catch (e) { /* settle timeout: se escribe igualmente */ }
        await new Promise((r) => setTimeout(r, 350));
        let html = await page.content();
        // eliminar el fallback no-JS del body (redundante y contradictorio con el contenido prerenderizado); se conserva el <noscript> de fuentes del <head>
        html = html.replace(/<body>[\s\S]*?<\/noscript>/, (m) => m.replace(/<noscript>[\s\S]*?<\/noscript>/, ""));
        const out = path.join(BUILD, route, "index.html");
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, html);
        done++;
        if (done % 25 === 0) console.log(`prerender: ${done}/${routes.length}`);
      } catch (e) { fails.push(route); }
    }
    await page.close();
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  // reintento secuencial de rutas que no asentaron
  if (fails.length === 0 && stuck.length) {
    console.log(`prerender: reintentando ${stuck.length} rutas no asentadas en secuencial`);
    for (const route of stuck.splice(0)) { routes.length = 0; routes.push(route); idx = 0; const w = worker(); await w; }
  }
  // puerta de seguridad: ningun index.html puede quedar con contenido invisible
  const left = [];
  for (const route of allRoutes) {
    const f = path.join(BUILD, route, "index.html");
    if (fs.existsSync(f)) { const body = fs.readFileSync(f, "utf8").split("<body")[1] || ""; if (/style="[^"]*opacity: 0[;"]/.test(body.replace(/<style>[\s\S]*?<\/style>/g, ""))) left.push(route); }
  }
  await browser.close();
  server.close();
  if (left.length) { console.error("prerender: rutas con contenido invisible: " + left.join(", ")); process.exitCode = 1; }
  console.log(`prerender: completado ${done}/${routes.length}` + (fails.length ? ` FALLOS: ${fails.join(", ")}` : ""));
  if (fails.length) process.exitCode = 1;
})();
