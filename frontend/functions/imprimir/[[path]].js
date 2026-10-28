// Fallback SPA para las hojas de impresión: sirven la app con la ruta dinámica.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  return context.env.ASSETS.fetch(new Request(new URL("/index.html", url.origin), context.request));
}
