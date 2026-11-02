import { afterEach, describe, expect, it, vi } from "vitest";
import { handle, parseRange } from "./index";

const env = { MAPY_API_KEY: "test-key" };
const call = (path: string, e: Record<string, unknown> = env) =>
  handle(new Request(`https://api.test${path}`), e as never);

afterEach(() => vi.restoreAllMocks());

describe("api", () => {
  it("health", async () => {
    expect(await (await call("/health")).json()).toEqual({ ok: true });
  });
  it("odmítne neznámou sadu map", async () => {
    expect((await call("/tiles/evil/1/1/1")).status).toBe(400);
  });
  it("přidá klíč na straně serveru a nevrací ho klientovi", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("png", { headers: { "content-type": "image/png" } }),
    );
    const res = await call("/tiles/outdoor/12/2234/1388");
    expect(res.status).toBe(200);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.mapy.cz/v1/maptiles/outdoor/256/12/2234/1388");
    expect((init.headers as Record<string, string>)["X-Mapy-Api-Key"]).toBe("test-key");
    expect(JSON.stringify([...res.headers])).not.toContain("test-key");
  });
  it("obsah bez R2 vrací 501", async () => {
    expect((await call("/content/a.json")).status).toBe(501);
  });

  it("Range: jednoduché, otevřené a koncové rozsahy, neplatné se zahodí", () => {
    expect(parseRange("bytes=0-99", 1000)).toEqual({ offset: 0, length: 100 });
    expect(parseRange("bytes=900-", 1000)).toEqual({ offset: 900, length: 100 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ offset: 900, length: 100 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ offset: 900, length: 100 });
    expect(parseRange("bytes=2000-", 1000)).toBeNull();
    expect(parseRange("bytes=5-2", 1000)).toBeNull();
    expect(parseRange("items=0-1", 1000)).toBeNull();
    expect(parseRange(null, 1000)).toBeNull();
  });

  it("obsah z R2: celý soubor, Range a neexistující klíč; mapy se kešují navždy", async () => {
    const body = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const bucket = {
      head: async (k: string) => (k === "maps/a.pmtiles" ? { size: 10, httpEtag: '"e"', writeHttpMetadata: () => {} } : null),
      get: async (k: string, o?: { range?: { offset: number; length: number } }) => {
        if (k !== "maps/a.pmtiles") return null;
        const r = o?.range;
        return { body: new Blob([r ? body.slice(r.offset, r.offset + r.length) : body]).stream() };
      },
    };
    const e = { ...env, CONTENT: bucket };
    const full = await call("/content/maps/a.pmtiles", e);
    expect(full.status).toBe(200);
    expect(full.headers.get("cache-control")).toContain("immutable");
    expect((await full.arrayBuffer()).byteLength).toBe(10);
    const part = await handle(new Request("https://api.test/content/maps/a.pmtiles", { headers: { range: "bytes=2-4" } }), e as never);
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 2-4/10");
    expect([...new Uint8Array(await part.arrayBuffer())]).toEqual([2, 3, 4]);
    expect((await call("/content/maps/b.pmtiles", e)).status).toBe(404);
    const bad = await handle(new Request("https://api.test/content/maps/a.pmtiles", { headers: { range: "bytes=50-" } }), e as never);
    expect(bad.status).toBe(416);
  });
});
