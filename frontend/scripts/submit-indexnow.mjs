// Envía todas las URLs del sitemap a IndexNow (protocolo abierto, sin cuenta).
// La propiedad se demuestra con el archivo <clave>.txt alojado en la raíz de la web.
// Uso: node scripts/submit-indexnow.mjs   (tras un despliegue en producción)
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const keyFile = readdirSync(publicDir).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.error("No se encuentra el archivo de clave IndexNow en public/"); process.exit(1); }
const key = keyFile.replace(".txt", "");
const host = "www.apasoligero.com";
const sitemap = readFileSync(join(publicDir, "sitemap.xml"), "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`IndexNow: ${urlList.length} URLs, clave ${key.slice(0, 6)}…`);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList }),
});
console.log("IndexNow respuesta:", res.status);
