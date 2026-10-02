import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.apasoligero.com";
const DEFAULT_DESCRIPTION =
  "Archivo de música militar española: letras de canciones de paso ligero, himnos, toques de corneta, marchas y lemas de unidades.";

function setMeta(selector, attribute, value) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export default function useTitle(title, description = DEFAULT_DESCRIPTION) {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = title
      ? `${title} — A Paso Ligero .com`
      : "A Paso Ligero: Canciones e himnos militares de España";
    const canonicalUrl = `${SITE_URL}${pathname}`;

    document.title = pageTitle;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", pageTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "content", pageTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);
  }, [title, description, pathname]);
}
