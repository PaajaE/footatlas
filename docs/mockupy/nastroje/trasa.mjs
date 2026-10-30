// Podklady pro mockupy: skutečný tok Vltavy z mapových dat a mapy v pergamenovém stylu.
//   node trasa.mjs trasa   spočítá trasu a kilometry míst do trasa.json
//   node trasa.mjs mapy    vykreslí mapy do ../assets a polohy míst do ../assets/mapy.json
// Potřebuje Playwright s Chromiem a přístup na tiles.openfreemap.org a unpkg.com.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const dir = path.dirname(fileURLToPath(import.meta.url));
const assets = process.env.MAPY_OUT || path.join(dir, '..', 'assets');
// Barvy trasy pro denní a noční mapu; noční verze se ukládá s příponou -noc.
const TEMATA = {
  den: { suffix: '', route: { done: '#9B2C22', plan: '#3A2A1C', halo: '#F3E6C4', w: 3.2 }, life: { done: '#9B2C22', plan: '#3A2A1C', halo: '#F3E6C4' } },
  noc: { suffix: '-noc', route: { done: '#E0704A', plan: '#E2D3B4', halo: '#2B241C', w: 3.2 }, life: { done: '#E0704A', plan: '#E2D3B4', halo: '#2B241C' } }
};
const data = JSON.parse(fs.readFileSync(path.join(dir, 'mista.json'), 'utf8'));

const hav = (a, b) => {
  const R = 6371, r = Math.PI / 180, dLa = (b[1] - a[1]) * r, dLo = (b[0] - a[0]) * r;
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const d2 = (a, b) => (a[0] - b[0]) ** 2 + ((a[1] - b[1]) * 1.55) ** 2;
const nearestIdx = (line, pt) => { let k = 0, b = Infinity; line.forEach((p, i) => { const d = d2(p, pt); if (d < b) { b = d; k = i; } }); return k; };

// Kousky řeky z dlaždic poskládá po proudu do jedné linie.
function chain(lines, start, end) {
  const pool = lines.map(l => l.slice());
  let bi = 0, bj = 0, bd = Infinity;
  pool.forEach((l, i) => l.forEach((p, j) => { const d = d2(p, start); if (d < bd) { bd = d; bi = i; bj = j; } }));
  let cur = pool.splice(bi, 1)[0];
  if (cur[0][1] > cur[cur.length - 1][1]) { cur.reverse(); bj = cur.length - 1 - bj; }
  const route = cur.slice(bj);
  for (let guard = 0; guard < 5000 && pool.length; guard++) {
    const tail = route[route.length - 1];
    if (d2(tail, end) < 0.00003) break;
    let best = -1, rev = false, b2 = Infinity;
    pool.forEach((l, i) => {
      const a = d2(l[0], tail), b = d2(l[l.length - 1], tail);
      if (a < b2) { b2 = a; best = i; rev = false; }
      if (b < b2) { b2 = b; best = i; rev = true; }
    });
    if (best < 0 || b2 > 0.003) break;
    const l = pool.splice(best, 1)[0]; if (rev) l.reverse();
    if (l[l.length - 1][1] < tail[1] - 0.01 && d2(l[l.length - 1], end) > d2(tail, end)) continue;
    route.push(...(b2 < 1e-9 ? l.slice(1) : l));
  }
  return route.slice(0, nearestIdx(route, end) + 1);
}

async function openPage(browser) {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto('file://' + path.join(dir, 'mapa.html'));
  return page;
}

async function trasa() {
  const browser = await chromium.launch();
  const page = await openPage(browser);
  await page.evaluate(o => setup(o), { w: 1100, h: 1700, parchment: false, center: [14.40, 50.205], zoom: 11.6 });
  const lines = await page.evaluate(() => riverLines());
  await browser.close();
  const route = chain(lines, data.start, data.cil);
  const km = [0];
  for (let i = 1; i < route.length; i++) km.push(km[i - 1] + hav(route[i - 1], route[i]));
  const mista = data.mista.map(m => { const i = nearestIdx(route, [m.lon, m.lat]); return { id: m.id, i, km: +km[i].toFixed(2) }; });
  fs.writeFileSync(path.join(dir, 'trasa.json'), JSON.stringify({ delkaKm: +km.at(-1).toFixed(2), route, km: km.map(v => +v.toFixed(3)), mista }));
  console.log('délka', km.at(-1).toFixed(1), 'km');
  for (const m of mista.sort((a, b) => a.km - b.km)) console.log(m.km.toFixed(1).padStart(5), m.id);
}

// Velký kruh pro životní cestu (kolem světa na východ).
function greatCircle(a, b, n = 120) {
  const r = Math.PI / 180, toV = ([lo, la]) => [Math.cos(la * r) * Math.cos(lo * r), Math.cos(la * r) * Math.sin(lo * r), Math.sin(la * r)];
  const A = toV(a), B = toV(b), dot = A.reduce((s, v, i) => s + v * B[i], 0), w = Math.acos(Math.min(1, dot));
  const out = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, s1 = Math.sin((1 - t) * w) / Math.sin(w), s2 = Math.sin(t * w) / Math.sin(w);
    const v = A.map((x, i) => s1 * x + s2 * B[i]);
    out.push([Math.atan2(v[1], v[0]) / r, Math.asin(v[2]) / r]);
  }
  for (let k = 1; k < out.length; k++) while (out[k][0] < out[k - 1][0] - 180) out[k][0] += 360;
  return out;
}
function cut(line, kmLimit) {
  const out = [line[0]]; let acc = 0;
  for (let i = 1; i < line.length; i++) {
    const d = hav(line[i - 1], line[i]);
    if (acc + d >= kmLimit) { const t = (kmLimit - acc) / d; out.push([line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])]); return out; }
    acc += d; out.push(line[i]);
  }
  return out;
}

async function mapy() {
  const t = JSON.parse(fs.readFileSync(path.join(dir, 'trasa.json'), 'utf8'));
  const stav = JSON.parse(fs.readFileSync(path.join(dir, 'stav.json'), 'utf8'));
  const route = t.route, youIdx = t.km.findIndex(v => v >= stav.usloKm);
  const placeAt = Object.fromEntries(t.mista.map(m => [m.id, route[m.i]]));
  const kmOf = Object.fromEntries(t.mista.map(m => [m.id, m.km]));
  const sub = (fromKm, toKm) => route.filter((_, i) => t.km[i] >= fromKm && t.km[i] <= toKm);
  const bboxOf = line => { const lo = line.map(p => p[0]), la = line.map(p => p[1]); return [[Math.min(...lo), Math.min(...la)], [Math.max(...lo), Math.max(...la)]]; };

  const praha = [14.42, 50.08], tokio = [139.69, 35.69], sf = [-122.42 + 360, 37.77];
  const life = [...greatCircle(praha, tokio), ...greatCircle(tokio, sf).slice(1)];
  const lifeDone = cut(life, stav.zivotKm);

  const e = stav.etapy;
  const views = [
    { name: 'vyprava-mapa', w: 390, h: 844, center: route[youIdx], zoom: 11.15, pan: [85, 30], route: { line: route, cut: youIdx } },
    { name: 'zastavka-mapa', w: 358, h: 132, center: placeAt['levy-hradec'], zoom: 13.2, route: { line: route, cut: youIdx } },
    { name: 'pohlednice-etapa', w: 322, h: 150, bounds: bboxOf(sub(e[1].od, e[1].do)), pad: { top: 18, bottom: 18, left: 24, right: 24 }, route: { line: sub(e[1].od, e[1].do), cut: 10000 }, jenDen: true },
    { name: 'objevovat-trasa', w: 116, h: 150, bounds: bboxOf(route), pad: 12, route: { line: route, cut: youIdx, w: 2.4 } },
    { name: 'svet-karta', w: 342, h: 220, center: [106, 44], zoom: 0.18, life: { line: life, done: lifeDone }, jenDen: true },
    { name: 'svet-kronika', w: 358, h: 150, center: [106, 44], zoom: 0.18, life: { line: life, done: lifeDone } }
  ];

  const browser = await chromium.launch();
  const out = { stav, km: kmOf, delkaKm: t.delkaKm, views: {} };
  for (const v of views) for (const [tema, T] of Object.entries(TEMATA)) {
    if (v.jenDen && tema !== 'den') continue;
    const page = await openPage(browser);
    await page.evaluate(o => setup(o), { w: v.w, h: v.h, parchment: true, tema, center: v.center, zoom: v.zoom, bounds: v.bounds, pad: v.pad });
    if (v.pan) await page.evaluate(d => map.panBy(d, { duration: 0 }), v.pan);
    if (v.route) await page.evaluate(r => addRoute(r.line, r.cut, r.colors), { ...v.route, colors: { ...T.route, w: v.route.w || T.route.w } });
    if (v.life) await page.evaluate(l => addLife(l.line, l.done, l.colors), { ...v.life, colors: T.life });
    await page.evaluate(() => idle());
    await page.locator('#map').screenshot({ path: path.join(assets, `mapa-${v.name}${T.suffix}.jpg`), type: 'jpeg', quality: 84 });
    const ids = Object.keys(placeAt);
    const pts = await page.evaluate(p => project(p), [...ids.map(id => placeAt[id]), route[youIdx], ...(v.life ? [lifeDone.at(-1), praha, tokio] : [])]);
    const proj = Object.fromEntries(ids.map((id, k) => [id, pts[k]]));
    proj.vy = pts[ids.length];
    if (v.life) { proj.zivot = pts[ids.length + 1]; proj.praha = pts[ids.length + 2]; proj.tokio = pts[ids.length + 3]; }
    out.views[v.name] = { w: v.w, h: v.h, body: proj };
    await page.close();
    console.log('mapa', v.name, tema);
  }
  await browser.close();
  fs.writeFileSync(path.join(assets, 'mapy.json'), JSON.stringify(out, null, 1));
}

const cmd = process.argv[2];
if (cmd === 'trasa') await trasa();
else if (cmd === 'mapy') await mapy();
else console.log('použití: node trasa.mjs trasa|mapy');
