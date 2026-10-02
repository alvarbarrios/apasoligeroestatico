function parseRange(header, size) {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength === 0 || size === 0) {
      return { unsatisfiable: true };
    }
    const offset = Math.max(0, size - suffixLength);
    return { offset, length: size - offset };
  }

  const offset = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : size - 1;
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(requestedEnd) ||
    offset >= size ||
    offset > requestedEnd
  ) {
    return { unsatisfiable: true };
  }

  const end = Math.min(requestedEnd, size - 1);
  return { offset, length: end - offset + 1 };
}

function responseHeaders(object, size) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
  headers.set("Content-Length", String(size));
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", "Accept-Ranges, Content-Length, Content-Range, ETag");
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("ETag", object.httpEtag);
  return headers;
}

export async function onRequest(context) {
  const bucket = context.env.APL_AUDIO_BUCKET;
  if (!bucket) return context.next();

  const path = context.params.path;
  const segments = Array.isArray(path) ? path : [path];
  if (
    !segments.length ||
    segments.some(
      (segment) =>
        typeof segment !== "string" ||
        !/^[A-Za-z0-9._-]+$/.test(segment) ||
        segment === "." ||
        segment === "..",
    ) ||
    !segments[segments.length - 1].toLowerCase().endsWith(".mp3")
  ) {
    return new Response("Audio no encontrado", { status: 404 });
  }

  const key = segments.join("/");
  const request = context.request;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Método no permitido", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const rangeHeader = request.headers.get("Range");
  const ifRange = request.headers.get("If-Range");
  const metadata = request.method === "HEAD" || rangeHeader ? await bucket.head(key) : null;
  if ((request.method === "HEAD" || rangeHeader) && !metadata) return context.next();
  const useRange = Boolean(rangeHeader && (!ifRange || ifRange === metadata.httpEtag));

  if (request.method === "HEAD" || useRange) {
    const range = useRange ? parseRange(rangeHeader, metadata.size) : null;
    const headers = responseHeaders(metadata, metadata.size);
    if (range?.unsatisfiable) {
      headers.set("Content-Range", `bytes */${metadata.size}`);
      headers.delete("Content-Length");
      return new Response(null, { status: 416, headers });
    }
    if (request.method === "HEAD") {
      if (range) {
        const end = range.offset + range.length - 1;
        headers.set("Content-Range", `bytes ${range.offset}-${end}/${metadata.size}`);
        headers.set("Content-Length", String(range.length));
      }
      return new Response(null, { status: range ? 206 : 200, headers });
    }
    if (range) {
      const object = await bucket.get(key, { range: { offset: range.offset, length: range.length } });
      if (!object) return context.next();
      const length = object.range?.length ?? range.length;
      const offset = object.range?.offset ?? range.offset;
      const end = offset + length - 1;
      object.writeHttpMetadata(headers);
      headers.set("Content-Type", headers.get("Content-Type") || "audio/mpeg");
      headers.set("Content-Length", String(length));
      headers.set("Content-Range", `bytes ${offset}-${end}/${metadata.size}`);
      headers.set("ETag", object.httpEtag);
      return new Response(object.body, { status: 206, headers });
    }
  }

  const object = await bucket.get(key);
  if (!object) return context.next();
  const headers = responseHeaders(object, object.size);
  return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
}
