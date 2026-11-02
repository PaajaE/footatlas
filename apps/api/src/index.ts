export interface Env {
  MAPY_API_KEY: string;
  CONTENT?: R2Bucket;
}

/** Povolené sady map Mapy.com (ověřit v dokumentaci poskytovatele). */
const MAPSETS = new Set(["basic", "outdoor", "winter", "aerial"]);
const TILE_RE = /^\/tiles\/([a-z]+)\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})$/;
const UPSTREAM = "https://api.mapy.cz/v1/maptiles";

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });

  if (url.pathname === "/health") return Response.json({ ok: true });

  const tile = TILE_RE.exec(url.pathname);
  if (tile) return proxyTile(tile, env);

  if (url.pathname.startsWith("/content/")) return serveContent(url.pathname.slice(9), request, env);

  return new Response("Not found", { status: 404 });
}

export default { fetch: handle };

async function proxyTile(m: RegExpExecArray, env: Env): Promise<Response> {
  const [, mapset, z, x, y] = m;
  if (!mapset || !MAPSETS.has(mapset)) return new Response("Unknown mapset", { status: 400 });
  if (!env.MAPY_API_KEY) return new Response("Server not configured", { status: 500 });

  const upstream = await fetch(`${UPSTREAM}/${mapset}/256/${z}/${x}/${y}`, {
    headers: { "X-Mapy-Api-Key": env.MAPY_API_KEY },
    cf: { cacheEverything: true, cacheTtl: 86400 },
  });
  if (!upstream.ok) return new Response("Upstream error", { status: 502 });

  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") ?? "image/png");
  headers.set("cache-control", "public, max-age=86400");
  return new Response(upstream.body, { headers });
}

/** Rozsah z hlavičky Range (`bytes=a-b`, `bytes=a-`, `bytes=-n`) pro objekt o velikosti `size`; `null` = žádný nebo neplatný. */
export function parseRange(header: string | null, size: number): { offset: number; length: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? "");
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    const n = Number(m[2]);
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start > end || start >= size) return null;
  return { offset: start, length: end - start + 1 };
}

async function serveContent(key: string, request: Request, env: Env): Promise<Response> {
  if (!env.CONTENT) return new Response("Content store not configured", { status: 501 });
  if (!key || key.includes("..")) return new Response("Bad request", { status: 400 });
  const head = await env.CONTENT.head(key);
  if (!head) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  head.writeHttpMetadata(headers);
  headers.set("etag", head.httpEtag);
  headers.set("accept-ranges", "bytes");
  // Soubory map nesou v názvu otisk obsahu, takže se nikdy nemění a smí se kešovat navždy.
  headers.set("cache-control", key.startsWith("maps/") ? "public, max-age=31536000, immutable" : "public, max-age=3600");
  const range = parseRange(request.headers.get("range"), head.size);
  if (request.headers.has("range") && !range) {
    headers.set("content-range", `bytes */${head.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (request.method === "HEAD") {
    headers.set("content-length", String(head.size));
    return new Response(null, { headers });
  }
  const obj = await env.CONTENT.get(key, range ? { range } : undefined);
  if (!obj) return new Response("Not found", { status: 404 });
  if (range) {
    headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    headers.set("content-length", String(range.length));
    return new Response((obj as R2ObjectBody).body, { status: 206, headers });
  }
  headers.set("content-length", String(head.size));
  return new Response((obj as R2ObjectBody).body, { headers });
}
