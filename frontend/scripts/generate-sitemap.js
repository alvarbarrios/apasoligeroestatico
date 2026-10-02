const fs = require("fs");
const path = require("path");

const siteUrl = "https://www.apasoligero.com";
const archivePath = path.join(__dirname, "..", "src", "data", "archive.json");
const sitemapPath = path.join(__dirname, "..", "public", "sitemap.xml");
const buildDir = path.join(__dirname, "..", "build");
const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));

const routes = new Map();
const addRoute = (route, title, description) => routes.set(route, { title, description });

[
  ["/", "A Paso Ligero .com — Web de Músicas Militares", "Archivo de músicas militares: canciones de paso ligero, himnos, toques de corneta y lemas de unidades de las Fuerzas Armadas Españolas."],
  ["/canciones", "Canciones militares", "Letras de canciones militares, himnos, toques de corneta y canciones de otros ejércitos."],
  ["/canciones/paso-ligero", "Canciones de paso ligero", "Letras de canciones militares de paso ligero para cantar en unidad."],
  ["/canciones/otras", "Otras canciones militares", "Letras de canciones y miscelánea militar recopiladas en A Paso Ligero .com."],
  ["/canciones/himnos", "Himnos militares", "Letras de himnos de España, los Ejércitos, la Armada, la Guardia Civil y otras unidades."],
  ["/canciones/corneta", "Toques de corneta", "Archivo de toques de corneta: escucha las señales y consulta sus nombres y significados."],
  ["/canciones/corneta/cornetin", "Toques de cornetín", "Archivo de toques de cornetín y sus significados."],
  ["/canciones/internacional", "Cancionero militar internacional", "Canciones militares de otros países y ejércitos."],
  ["/audios", "Archivo de audios militares", "Explora y escucha canciones, himnos y toques militares."],
  ["/lemas", "Lemas de unidades militares", "Lemas en español y latín de unidades de las Fuerzas Armadas Españolas."],
  ["/libro-de-visitas", "Libro de visitas", "Deja tu firma en el libro de visitas de A Paso Ligero .com."],
  ["/enlaces", "Enlaces de interés", "Enlaces a páginas y recursos relacionados con la música y cultura militar."],
  ["/contacto", "Contacto", "Contacta con A Paso Ligero .com para enviar canciones, proponer correcciones o compartir material."],
].forEach(([route, title, description]) => addRoute(route, title, description));

for (const group of archive.himnosGroups || []) {
  addRoute(
    `/canciones/himnos/${encodeURIComponent(group.slug)}`,
    group.title,
    `Letras de ${group.title.toLowerCase()} y canciones militares recopiladas en A Paso Ligero .com.`,
  );
}

for (const group of archive.lemasGroups || []) {
  const slug = group.slug.startsWith("l") ? group.slug.slice(1) : group.slug;
  addRoute(`/lemas/${encodeURIComponent(slug)}`, group.title, `Lemas de unidades: ${group.title}.`);
}

for (const key of Object.keys(archive.songs || {})) {
  const parts = key.split("/");
  if (parts[0] === "pasoligero" && parts.length === 2) {
    const title = archive.songs[key].title;
    addRoute(`/canciones/paso-ligero/${encodeURIComponent(parts[1])}`, title, `Letra de ${title}, canción militar de paso ligero.`);
  } else if (parts[0] === "otras" && parts.length === 2) {
    const title = archive.songs[key].title;
    addRoute(`/canciones/otras/${encodeURIComponent(parts[1])}`, title, `Letra de ${title}, canción del archivo militar de A Paso Ligero .com.`);
  } else if (parts[0] === "himnos" && parts.length === 3) {
    const title = archive.songs[key].title;
    addRoute(`/canciones/himnos/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}`, title, `Letra de ${title}, himno militar recopilado en A Paso Ligero .com.`);
  }
}

const entries = [...routes.keys()]
  .sort((a, b) => a.localeCompare(b))
  .map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`)
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
fs.writeFileSync(sitemapPath, sitemap);

if (process.argv.includes("--postbuild")) {
  const templatePath = path.join(buildDir, "index.html");
  const template = fs.readFileSync(templatePath, "utf8");
  const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const replaceMeta = (html, key, value, attribute = "name") => {
    const pattern = new RegExp(`<meta ${attribute}="${escapeRegExp(key)}" content="[^"]*"\\s*/?>`);
    return html.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`);
  };

  for (const [route, meta] of routes) {
    let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
    html = replaceMeta(html, "description", meta.description);
    html = replaceMeta(html, "og:title", meta.title, "property");
    html = replaceMeta(html, "og:description", meta.description, "property");
    html = replaceMeta(html, "og:url", `${siteUrl}${route}`, "property");
    html = replaceMeta(html, "twitter:title", meta.title);
    html = replaceMeta(html, "twitter:description", meta.description);
    html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${siteUrl}${route}" />`);
    const outputDir = path.join(buildDir, ...route.split("/").filter(Boolean));
    if (route !== "/") fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(route === "/" ? buildDir : outputDir, "index.html"), html);
  }
}
