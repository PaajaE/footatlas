// Jednoduchý statický server s podporou HTTP Range (PMTiles ho vyžadují) pro lokální vykreslení.
//   node serve.mjs [port]   (výchozí 8787, servíruje složku tools/maps/out a render.html)
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const roots = [path.join(here, "out"), here];
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".pbf": "application/x-protobuf", ".pmtiles": "application/octet-stream" };

export function startServer(port = 8787) {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "") || "render.html";
    if (rel.includes("..")) return void res.writeHead(400).end();
    const file = roots.map((r) => path.join(r, rel)).find((f) => fs.existsSync(f) && fs.statSync(f).isFile());
    if (!file) return void res.writeHead(404).end("not found");
    const size = fs.statSync(file).size;
    const headers = { "content-type": types[path.extname(file)] ?? "application/octet-stream", "accept-ranges": "bytes", "access-control-allow-origin": "*" };
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
    if (range) {
      const start = range[1] ? Number(range[1]) : size - Number(range[2]);
      const end = range[1] && range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { ...headers, "content-length": size });
      fs.createReadStream(file).pipe(res);
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.argv[2] ?? 8787);
  await startServer(port);
  console.log(`http://127.0.0.1:${port}/`);
}
