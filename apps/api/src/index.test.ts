import { afterEach, describe, expect, it, vi } from "vitest";
import { handle } from "./index.js";

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
});
