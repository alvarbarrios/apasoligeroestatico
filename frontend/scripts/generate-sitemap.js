const fs = require("fs");
const path = require("path");
const archive = require("../src/data/archive.json");

const siteUrl = "https://www.apasoligero.com";
const publicDir = path.join(__dirname, "..", "public");
const buildDir = path.join(__dirname, "..", "build");
const routes = new Map();
const addRoute = (route, title, description) =>
  routes.set(route, { title, description });

[
  ["/", "A Paso Ligero: Canciones e himnos militares de España", "Archivo de música militar española: letras de canciones de paso ligero, himnos, toques de corneta, marchas y lemas de unidades."],
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
  ["/privacidad-cookies", "Privacidad y cookies", "Información sobre privacidad, tratamiento de datos personales y preferencias de cookies de A Paso Ligero."],
].forEach(([route, title, description]) => addRoute(route, title, description));

for (const group of archive.himnosGroups || []) {
  const groupPath = `/canciones/himnos/${encodeURIComponent(group.slug)}`;
  addRoute(
    groupPath,
    group.title,
    `Letras de ${group.title.toLowerCase()} y canciones militares recopiladas en A Paso Ligero .com.`,
  );
}

for (const group of archive.lemasGroups || []) {
  const slug = group.slug.startsWith("l") ? group.slug.slice(1) : group.slug;
  addRoute(`/lemas/${encodeURIComponent(slug)}`, group.title, `Lemas de unidades: ${group.title}.`);
}

for (const [key, song] of Object.entries(archive.songs || {})) {
  const parts = key.split("/");
  if (parts[0] === "pasoligero" && parts.length === 2) {
    addRoute(
      `/canciones/paso-ligero/${encodeURIComponent(parts[1])}`,
      song.title,
      `Letra de ${song.title}, canción militar de paso ligero.`,
    );
  } else if (parts[0] === "otras" && parts.length === 2) {
    addRoute(
      `/canciones/otras/${encodeURIComponent(parts[1])}`,
      song.title,
      `Letra de ${song.title}, canción del archivo militar de A Paso Ligero .com.`,
    );
  } else if (parts[0] === "himnos" && parts.length === 3) {
    addRoute(
      `/canciones/himnos/${encodeURIComponent(parts[1])}/${encodeURIComponent(parts[2])}`,
      song.title,
      `Letra de ${song.title}, himno militar recopilado en A Paso Ligero .com.`,
    );
  }
}

const xmlEscape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const withTrailingSlash = (route) => (route === "/" ? "/" : `${route}/`);

// JSON-LD por ruta: migas de pan en todas las páginas (menos la portada, que ya lleva
// el grafo WebSite/Person de la plantilla), CollectionPage en secciones y grupos, y
// MusicComposition en fichas de cancion + MusicRecording SOLO cuando hay audio real.
const segmentLabels = {
  canciones: "Canciones", himnos: "Himnos militares", "paso-ligero": "Canciones de paso ligero",
  otras: "Otras canciones militares", corneta: "Toques de corneta", cornetin: "Toques de cornetín",
  internacional: "Cancionero militar internacional", audios: "Archivo de audios militares",
  lemas: "Lemas", "libro-de-visitas": "Libro de visitas", enlaces: "Enlaces de interés",
  contacto: "Contacto", "privacidad-cookies": "Privacidad y cookies",
};
const breadcrumbLd = (route, title) => {
  const segs = route.split("/").filter(Boolean);
  const items = [{ "@type": "ListItem", position: 1, name: "Inicio", item: `${siteUrl}/` }];
  segs.forEach((seg, i) => {
    const prefix = "/" + segs.slice(0, i + 1).join("/");
    const isLast = i === segs.length - 1;
    const entry = routes.get(prefix);
    const name = isLast ? title : ((entry && entry.title) || segmentLabels[seg] || seg);
    items.push({ "@type": "ListItem", position: i + 2, name, item: `${siteUrl}${withTrailingSlash(prefix)}` });
  });
  return { "@type": "BreadcrumbList", itemListElement: items };
};
const songKeyFor = (route) => {
  const m = route.match(/^\/canciones\/(paso-ligero|otras)\/([^/]+)$/);
  if (m) return `${m[1] === "paso-ligero" ? "pasoligero" : "otras"}/${decodeURIComponent(m[2])}`;
  const h = route.match(/^\/canciones\/himnos\/([^/]+)\/([^/]+)$/);
  if (h) return `himnos/${decodeURIComponent(h[1])}/${decodeURIComponent(h[2])}`;
  return null;
};
const jsonLdFor = (route, meta) => {
  if (route === "/") return "";
  const pageUrl = `${siteUrl}${withTrailingSlash(route)}`;
  const graph = [breadcrumbLd(route, meta.title)];
  const song = songKeyFor(route) ? archive.songs[songKeyFor(route)] : null;
  if (song) {
    const compId = `${pageUrl}#composicion`;
    graph.unshift({ "@type": "MusicComposition", "@id": compId, name: song.title, url: pageUrl, inLanguage: "es", genre: "M\u00fasica militar", isPartOf: { "@id": `${siteUrl}/#website` } });
    const audio = (song.audios || [])[0];
    if (audio && audio.file) {
      graph.splice(1, 0, { "@type": "MusicRecording", "@id": `${pageUrl}#grabacion`, name: song.title, url: pageUrl, contentUrl: `${siteUrl}${audio.file}`, encodingFormat: "audio/mpeg", inLanguage: "es", recordingOf: { "@id": compId } });
    }
  } else {
    graph.unshift({ "@type": "CollectionPage", "@id": `${pageUrl}#pagina`, name: meta.title, description: meta.description, url: pageUrl, inLanguage: "es", isPartOf: { "@id": `${siteUrl}/#website` } });
  }
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c")}</script>`;
};
const sitemapEntries = [...routes.keys()]
  .sort((a, b) => a.localeCompare(b))
  .map((route) => `  <url><loc>${xmlEscape(`${siteUrl}${withTrailingSlash(route)}`)}</loc></url>`)
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`;
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);

if (process.argv.includes("--postbuild")) {
  const templatePath = path.join(buildDir, "index.html");
  const template = fs.readFileSync(templatePath, "utf8");
  const escapeHtml = (value) =>
    value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const replaceMeta = (html, attribute, key, value) => {
    const pattern = new RegExp(
      `<meta\\s+${attribute}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*/?>`,
    );
    return html.replace(
      pattern,
      `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`,
    );
  };

  for (const [route, meta] of routes) {
    let html = template.replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(`${meta.title} — A Paso Ligero .com`)}</title>`,
    );
    html = replaceMeta(html, "name", "description", meta.description.slice(0, 160));
    html = replaceMeta(html, "property", "og:title", meta.title);
    html = replaceMeta(html, "property", "og:description", meta.description.slice(0, 160));
    html = replaceMeta(html, "property", "og:url", `${siteUrl}${withTrailingSlash(route)}`);
    html = replaceMeta(html, "name", "twitter:title", meta.title);
    html = replaceMeta(html, "name", "twitter:description", meta.description.slice(0, 160));
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${siteUrl}${withTrailingSlash(route)}" />`,
    );
    const ld = jsonLdFor(route, meta);
    if (ld) html = html.replace("</head>", `${ld}</head>`);
    const outputDir = path.join(buildDir, ...route.split("/").filter(Boolean));
    if (route !== "/") fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(route === "/" ? buildDir : outputDir, "index.html"), html);
  }
}
