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
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });

  if (url.pathname === "/health") return Response.json({ ok: true });

  const tile = TILE_RE.exec(url.pathname);
  if (tile) return proxyTile(tile, env);

  if (url.pathname.startsWith("/content/")) return serveContent(url.pathname.slice(9), env);

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

async function serveContent(key: string, env: Env): Promise<Response> {
  if (!env.CONTENT) return new Response("Content store not configured", { status: 501 });
  if (!key || key.includes("..")) return new Response("Bad request", { status: 400 });
  const obj = await env.CONTENT.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=3600");
  return new Response(obj.body, { headers });
}
