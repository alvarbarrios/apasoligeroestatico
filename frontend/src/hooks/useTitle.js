import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "A Paso Ligero .com";
const SITE_URL = "https://www.apasoligero.com";
const DEFAULT_DESCRIPTION = "Archivo de músicas militares: canciones de paso ligero, himnos, toques de corneta y lemas de unidades de las Fuerzas Armadas Españolas.";

function setMeta(keyAttribute, key, value) {
  let element = document.head.querySelector(`meta[${keyAttribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(keyAttribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", value);
}

export default function useTitle(title) {
  const { pathname } = useLocation();
  useEffect(() => {
    const pageTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Web de Músicas Militares`;
    let description = DEFAULT_DESCRIPTION;
    if (pathname.startsWith("/canciones/paso-ligero")) {
      description = "Letras de canciones militares de paso ligero para cantar en unidad. Consulta títulos, estrofas y audios del archivo.";
    } else if (pathname.startsWith("/canciones/himnos")) {
      description = "Letras e historia de himnos de España y de los Ejércitos, la Armada, la Guardia Civil y otras unidades.";
    } else if (pathname.startsWith("/canciones/corneta")) {
      description = "Archivo de toques de corneta y cornetín: escucha las señales y consulta sus nombres y significados.";
    } else if (pathname.startsWith("/canciones/otras")) {
      description = "Letras de canciones y miscelánea militar recopiladas en A Paso Ligero .com.";
    } else if (pathname.startsWith("/canciones/internacional")) {
      description = "Canciones militares de otros países y ejércitos, recopiladas con aportaciones de colaboradores.";
    } else if (pathname.startsWith("/audios")) {
      description = "Explora y escucha el archivo de audios de canciones, himnos y toques militares de A Paso Ligero .com.";
    } else if (pathname.startsWith("/lemas")) {
      description = "Lemas en español y latín de unidades de las Fuerzas Armadas Españolas, reunidos en un solo archivo.";
    } else if (pathname.startsWith("/contacto")) {
      description = "Contacta con A Paso Ligero .com para enviar canciones, proponer correcciones o compartir material.";
    } else if (pathname.startsWith("/libro-de-visitas")) {
      description = "Deja tu firma en el libro de visitas de A Paso Ligero .com y descubre las aportaciones de sus visitantes.";
    } else if (title) {
      description = `${title}: letras y contenidos del archivo de músicas militares de A Paso Ligero .com.`;
    }
    description = description.slice(0, 160);
    const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    const url = `${SITE_URL}${normalizedPath}`;
    const privatePage = pathname === "/admin" || pathname.startsWith("/imprimir/") || title === "404";

    document.title = pageTitle;
    setMeta("name", "description", description);
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", url);
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "robots", privatePage ? "noindex, nofollow" : "index, follow, max-image-preview:large");

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, pathname]);
}
