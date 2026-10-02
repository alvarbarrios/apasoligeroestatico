const fs = require("fs");
const path = require("path");
const archive = require("../src/data/archive.json");

const SITE_URL = "https://www.apasoligero.com";
const paths = new Set([
  "/",
  "/canciones",
  "/canciones/paso-ligero",
  "/canciones/otras",
  "/canciones/himnos",
  "/canciones/corneta",
  "/canciones/corneta/cornetin",
  "/canciones/internacional",
  "/audios",
  "/lemas",
  "/enlaces",
  "/libro-de-visitas",
  "/contacto",
  "/privacidad-cookies",
]);

for (const section of ["pasoligero", "otras"]) {
  for (const item of archive[section].items) {
    paths.add(`/canciones/${section === "pasoligero" ? "paso-ligero" : "otras"}/${item.slug}`);
  }
}

for (const group of archive.himnosGroups) {
  paths.add(`/canciones/himnos/${group.slug}`);
  for (const item of group.items) {
    paths.add(`/canciones/himnos/${group.slug}/${item.slug}`);
  }
}

for (const group of archive.lemasGroups) {
  paths.add(`/lemas/${group.slug.replace(/^l/, "")}`);
}

const xmlEscape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const entries = [...paths]
  .sort()
  .map((urlPath) => `  <url><loc>${xmlEscape(`${SITE_URL}${urlPath}`)}</loc></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

fs.writeFileSync(path.join(__dirname, "..", "public", "sitemap.xml"), sitemap);
