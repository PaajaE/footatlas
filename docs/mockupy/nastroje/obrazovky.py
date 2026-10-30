"""Vygeneruje sedm obrazovek *.dc.html ze stavu výpravy, míst a vykreslených map.

    python3 obrazovky.py

Čte mista.json, stav.json, trasa.json a ../assets/mapy.json (viz trasa.mjs).
Ruční úpravy obrazovek na plátně je potřeba přenést sem, jinak je další běh přepíše.
"""
import json, math, random
from pathlib import Path

DIR = Path(__file__).parent
OUT = DIR.parent
data = json.loads((DIR / 'mista.json').read_text())
stav = json.loads((DIR / 'stav.json').read_text())
trasa = json.loads((DIR / 'trasa.json').read_text())
mapy = json.loads((OUT / 'assets' / 'mapy.json').read_text())

KM = {m['id']: m['km'] for m in trasa['mista']}
MISTA = sorted(({**m, 'km': KM[m['id']]} for m in data['mista']), key=lambda m: m['km'])
BY = {m['id']: m for m in MISTA}
USLO = stav['usloKm']
DELKA = trasa['delkaKm']
FOTO = {'vysehrad', 'troja', 'karluv-most', 'roztoky', 'levy-hradec', 'nelahozeves', 'veltrusy', 'melnik'}

def km(v, d=1):
    return f"{v:.{d}f}".replace('.', ',')

def mist(n):
    return f"{n} místo" if n == 1 else f"{n} místa" if 2 <= n <= 4 else f"{n} míst"

def etapa_of(k):
    for i, e in enumerate(stav['etapy']):
        if k <= e['do'] + 1e-6:
            return i
    return len(stav['etapy']) - 1

objeveno = [m for m in MISTA if m['km'] <= USLO]
pred = [m for m in MISTA if m['km'] > USLO]
ETAPA = etapa_of(USLO + 0.01)  # 0-based, aktuální etapa
DALSI_Z = next(m for m in pred if m['druh'] == 'zastavka')

# ---------------------------------------------------------------- společné

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC'
         '&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">')

CSS = """
body{margin:0;font-family:'Work Sans',system-ui,sans-serif}
.fa{width:390px;height:844px;box-sizing:border-box;background:#0F1A1E;color:#F2EEE6;position:relative;overflow:hidden;display:flex;flex-direction:column;font-family:'Work Sans',system-ui,sans-serif}
.fa *{box-sizing:border-box}
.fell{font-family:'IM Fell English',Georgia,serif;font-weight:400}
.sc{font-family:'IM Fell English SC',Georgia,serif;font-weight:400;letter-spacing:.05em}
.amber{color:#E7A44B}.muted{color:#9AA5A3}.gold{color:#E2B862}
.num{font-variant-numeric:tabular-nums}
.ph{background-size:cover;background-position:center}
.hero{position:relative;flex:none}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,26,30,.6) 0%,rgba(15,26,30,0) 22%,rgba(15,26,30,0) 45%,rgba(15,26,30,.9) 86%,#0F1A1E 100%)}
.hero>*{position:relative;z-index:1}
.hero.strong::after{background:linear-gradient(180deg,rgba(15,26,30,.85) 0%,rgba(15,26,30,.2) 30%,rgba(15,26,30,.15) 50%,rgba(15,26,30,.9) 86%,#0F1A1E 100%)}
.topbar{padding:56px 20px 0;display:flex;justify-content:space-between;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}
.rule{height:1px;background:linear-gradient(90deg,transparent,#E2B86288 12%,#E2B86288 88%,transparent)}
.eyebrow{display:flex;align-items:center;gap:8px;color:#E2B862;font-family:'IM Fell English SC',Georgia,serif;font-size:15px;letter-spacing:.06em}
.eyebrow::before,.eyebrow::after{content:"";height:1px;width:20px;background:#E2B862;opacity:.7}
.med{border-radius:50%;flex:none;background-size:cover;background-position:center;border:1.5px solid #E2B862;outline:1px solid #E2B86266;outline-offset:3px;position:relative}
.med.lock{filter:grayscale(1) brightness(.55);border-color:#56656A;outline-color:#56656A55}
.seal{position:absolute;right:-6px;bottom:-5px;width:20px;height:20px;background:#9B2C22;color:#F2D9B0;font-size:11px;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0,61% 10%,75% 5%,79% 20%,95% 25%,90% 39%,100% 50%,90% 61%,95% 75%,79% 80%,75% 95%,61% 90%,50% 100%,39% 90%,25% 95%,21% 80%,5% 75%,10% 61%,0 50%,10% 39%,5% 25%,21% 20%,25% 5%,39% 10%)}
.dot{width:40px;height:40px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;border:1.5px dashed #56656A;color:#9AA5A3}
.dot.on{border:none;background:#9B2C22;color:#F2D9B0}
.card{background:#18262B;border-radius:14px}
.btn{display:block;text-align:center;text-decoration:none;font-weight:600;font-size:16px;padding:15px;border-radius:14px}
.btn.pri{background:#E7A44B;color:#0F1A1E}
.btn.sec{border:1.5px solid #E2B86288;color:#F2EEE6}
.parch{position:relative;overflow:hidden}
.parch img{display:block;width:100%;height:100%}
.parch svg.ov{position:absolute;inset:0;width:100%;height:100%}
.attr{position:absolute;right:8px;bottom:5px;font-size:9px;color:#3A2A1C;opacity:.8;z-index:2}
.nav{display:flex;justify-content:space-around;padding:10px 6px 30px;font-size:12px;flex:none;margin-top:auto;background:#0F1A1E;color:#9AA5A3;border-top:1px solid #1F2E33;position:relative;z-index:3}
.nav a{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 0;text-decoration:none;color:inherit}
.nav a.on{color:#E7A44B}
"""

SVG_DEFS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="paper" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="4" seed="9"/>
    <feColorMatrix values="0 0 0 0 .62  0 0 0 0 .48  0 0 0 0 .26  0 0 0 .9 -.25"/>
    <feComposite in2="SourceGraphic" operator="in"/>
  </filter>
  <radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="60%" stop-color="#6E4E24" stop-opacity="0"/><stop offset="100%" stop-color="#6E4E24" stop-opacity=".42"/></radialGradient>
  <clipPath id="kruh" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>
</defs></svg>"""

ICONS = {
    'Domů': '<path d="M4 11l8-7 8 7v9H4z"/>',
    'Výprava': '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14"/>',
    'Objevovat': '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    'Kronika': '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z M5 17a3 3 0 013-3h11"/>',
}
NAV_HREF = {'Domů': 'Domu.dc.html', 'Výprava': 'Vyprava.dc.html', 'Objevovat': 'Objevovat.dc.html', 'Kronika': 'Kronika.dc.html'}

def nav(active):
    items = ''.join(
        f'<a href="{NAV_HREF[k]}" class="{"on" if k == active else ""}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" '
        f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{v}</svg>{k}</a>'
        for k, v in ICONS.items())
    return f'<nav class="nav">{items}</nav>'

def page(title, body, extra_css=''):
    return f"""<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{FONTS}
<style>{CSS}{extra_css}</style>
</helmet>
{SVG_DEFS}
{body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":390,"height":844}}}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
"""

def foto(mid):
    return f"background-image:url('assets/foto-{mid}.jpg')"

def torn(w, h, step=10, amp=3.2, seed=3):
    r = random.Random(seed); pts = []
    for x in range(0, w + 1, step): pts.append((x, r.uniform(0, amp)))
    for y in range(0, h + 1, step): pts.append((w - r.uniform(0, amp), y))
    for x in range(w, -1, -step): pts.append((x, h - r.uniform(0, amp)))
    for y in range(h, -1, -step): pts.append((r.uniform(0, amp), y))
    return "polygon(" + ",".join(f"{x / w * 100:.1f}% {y / h * 100:.1f}%" for x, y in pts) + ")"

INK, RED, PAPER = '#3A2A1C', '#9B2C22', '#EADBB5'

def rose(cx, cy, s=1.0):
    return f'''<g transform="translate({cx} {cy}) scale({s})">
      <circle r="21" fill="{PAPER}" fill-opacity=".8" stroke="{INK}" stroke-width=".8"/><circle r="17" fill="none" stroke="{INK}" stroke-width=".5"/>
      <polygon points="0,-24 4,-4 24,0 4,4 0,24 -4,4 -24,0 -4,-4" fill="{INK}"/><polygon points="0,-24 4,-4 0,0 -4,-4" fill="{RED}"/>
      <polygon points="14,-14 2,-2 -14,14 -2,2" fill="{INK}" opacity=".45"/><polygon points="-14,-14 -2,2 14,14 2,-2" fill="{INK}" opacity=".45"/>
      <text y="-28" text-anchor="middle" font-family="IM Fell English, serif" font-size="10" fill="{INK}">S</text></g>'''

def you(x, y):
    return (f'<circle cx="{x}" cy="{y}" r="13" fill="{RED}" opacity=".18"/>'
            f'<circle cx="{x}" cy="{y}" r="6.5" fill="{RED}" stroke="#F6EBD0" stroke-width="2.4"/>')

def marker(m, x, y, big=False, label=None, label_side='right'):
    """Zastávka s fotkou = medailon, bez fotky = inkoustový kruh; malý objev = pečeť nebo prázdný bod."""
    done = m['km'] <= USLO
    nxt = m['id'] == DALSI_Z['id']
    out = ''
    if m['druh'] == 'zastavka':
        r = 17 if big else 13
        ring = '#E7A44B' if nxt else (RED if done else INK)
        sw = 2.6 if nxt else 1.8
        if m['id'] in FOTO:
            gray = '' if (done or nxt) else ' style="filter:grayscale(1) brightness(.85)"'
            out += (f'<circle cx="{x}" cy="{y}" r="{r + 1.5}" fill="{PAPER}" stroke="{ring}" stroke-width="{sw}"/>'
                    f'<image href="assets/foto-{m["id"]}.jpg" x="{x - r + 1}" y="{y - r + 1}" width="{2 * r - 2}" height="{2 * r - 2}" '
                    f'clip-path="url(#kruh)" preserveAspectRatio="xMidYMid slice"{gray}/>')
        else:
            out += (f'<circle cx="{x}" cy="{y}" r="{r - 4}" fill="{PAPER}" stroke="{ring}" stroke-width="{sw}"/>'
                    f'<path d="M{x - 4} {y + 4} v-6 l2 -3 2 3 v-3 h4 v9 z" fill="{ring}"/>')
        if done:
            out += f'<circle cx="{x + r * .7}" cy="{y + r * .7}" r="5.5" fill="{RED}" stroke="#F2D9B0" stroke-width="1"/><path d="M{x + r * .7 - 2.5} {y + r * .7} l1.8 1.8 3.2 -3.4" stroke="#F2D9B0" stroke-width="1.3" fill="none"/>'
    else:
        if done:
            out += f'<circle cx="{x}" cy="{y}" r="5.2" fill="{RED}" stroke="#F3E6C4" stroke-width="1.6"/>'
        else:
            out += f'<circle cx="{x}" cy="{y}" r="4.6" fill="#F3E6C4" stroke="{INK}" stroke-width="1.3"/>'
    if label:
        fs = 12.5
        w = len(label) * 6.1 + 12
        r = (17 if big else 13) if m['druh'] == 'zastavka' else 6
        lx = x + r + 6 if label_side == 'right' else x - r - 6 - w
        out += (f'<rect x="{lx:.1f}" y="{y - 10}" width="{w:.1f}" height="20" fill="{PAPER}" fill-opacity=".92" stroke="{INK}" stroke-width=".6"/>'
                f'<text x="{lx + 6:.1f}" y="{y + 4.2}" font-family="IM Fell English, serif" font-style="italic" font-size="{fs}" fill="{INK}">{label}</text>')
    return out

def overlay(view, extra, paper=True):
    v = mapy['views'][view]
    w, h = v['w'], v['h']
    tex = (f'<rect width="{w}" height="{h}" fill="#E7D4AB" filter="url(#paper)" style="mix-blend-mode:multiply" opacity=".9"/>'
           if paper else '')
    return (f'<svg class="ov" viewBox="0 0 {w} {h}" aria-hidden="true">{tex}'
            f'<rect width="{w}" height="{h}" fill="url(#vig)"/>{extra}</svg>')

def parch_map(view, extra, style='', cls='parch', attr=True):
    v = mapy['views'][view]
    a = '<span class="attr">© OpenStreetMap</span>' if attr else ''
    return (f'<div class="{cls}" style="width:{v["w"]}px;height:{v["h"]}px;{style}">'
            f'<img src="assets/mapa-{view}.jpg" alt="">{overlay(view, extra)}{a}</div>')

def P(view, mid):
    return mapy['views'][view]['body'][mid]

def visible(view, mid, pad=8):
    v = mapy['views'][view]; x, y = v['body'][mid]
    return pad <= x <= v['w'] - pad and pad <= y <= v['h'] - pad

# ---------------------------------------------------------------- 1 Karta života

def karta():
    b = mapy['views']['svet-karta']['body']
    px, py = b['praha']; tx, ty = b['tokio']; zx, zy = b['zivot']
    extra = (f'<circle cx="{px}" cy="{py}" r="4.5" fill="{RED}" stroke="#F3E6C4" stroke-width="1.5"/>'
             f'<text x="{px + 2}" y="{py + 17}" font-family="IM Fell English, serif" font-style="italic" font-size="13" fill="{INK}">Praha</text>'
             f'<path d="M{tx} {ty} v-16 l10 4 -10 4" fill="{RED}" stroke="{INK}" stroke-width=".8"/>'
             f'<text x="{tx - 44}" y="{ty + 18}" font-family="IM Fell English, serif" font-style="italic" font-size="13" fill="{INK}">Tokio, 9 100 km</text>'
             + you(zx - 6, zy) + rose(36, 182, .8))
    body = f'''<div class="fa">
  <div style="padding:56px 24px 0;display:flex;justify-content:space-between;align-items:baseline">
    <span class="fell" style="font-size:22px">FootAtlas</span><span class="muted" style="font-size:13px">Načteno z Apple Health</span>
  </div>
  <div style="padding:26px 24px 0;display:flex;flex-direction:column;gap:6px">
    <span class="eyebrow">Za život jste ušli</span>
    <div style="display:flex;align-items:baseline;gap:10px"><span class="fell num" style="font-size:84px;line-height:.95">14 200</span><span class="fell" style="font-size:28px">km</span></div>
    <p style="margin:4px 0 0;font-size:17px;line-height:1.45;color:#D9DEDB">To je z Prahy až do Tokia a ještě 5 100 km dál, přes Tichý oceán.</p>
  </div>
  {parch_map('svet-karta', extra, f'margin:18px 24px 0;clip-path:{torn(342, 220)}')}
  <div style="padding:18px 24px 0;display:flex;flex-direction:column;gap:9px">
    <div style="display:flex;justify-content:space-between;font-size:14px"><span style="font-weight:600">Z čeho se číslo skládá</span><span class="muted">od roku 2016</span></div>
    <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;gap:2px"><div style="flex:85;background:#E2B862"></div><div style="flex:15;background:repeating-linear-gradient(135deg,#E2B862 0 3px,#18262B 3px 6px)"></div></div>
    <div style="display:flex;flex-direction:column;gap:4px;font-size:13.5px" class="num"><div style="display:flex;justify-content:space-between"><span>Ověřeno ze zdravotních dat</span><span>12 100 km</span></div><div style="display:flex;justify-content:space-between" class="muted"><span>Odhad z kroků</span><span>2 100 km</span></div></div>
  </div>
  <div style="margin-top:auto;padding:0 24px 34px;display:flex;flex-direction:column;gap:12px">
    <a href="Domu.dc.html" class="btn pri">Vybrat první výpravu</a>
    <a href="#share" class="btn sec">Sdílet kartu jako obrázek</a>
    <span class="muted" style="text-align:center;font-size:13px">Data zůstávají na vašem telefonu.</span>
  </div>
</div>'''
    return page('Karta života', body)

# ---------------------------------------------------------------- 2 Domů

def domu():
    nz = DALSI_Z
    rows = ''
    for m in [m for m in pred if m['km'] <= USLO + 5][:4]:
        z = m['druh'] == 'zastavka'
        icon = (f'<div class="med" style="width:40px;height:40px;{foto(m["id"])}"></div>' if m['id'] in FOTO
                else f'<div class="dot">{"◆" if z else "·"}</div>')
        rows += f'''<div style="display:flex;align-items:center;gap:14px;padding:9px 0">
        {icon}
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px"><span class="fell" style="font-size:18px;line-height:1.1">{m['nazev']}</span><span class="muted" style="font-size:12.5px">{'Zastávka' if z else 'Malý objev'} · km {km(m['km'])}</span></div>
        <span class="num" style="font-weight:600;font-size:15px;white-space:nowrap">{km(m['km'] - USLO)} km</span>
      </div>'''
    count5 = len([m for m in pred if m['km'] <= USLO + 5])
    nova = [m for m in objeveno if m['km'] > USLO - 11.4]
    body = f'''<div class="fa">
  <div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:6px">
    <span class="muted" style="font-size:13px">Čtvrtek 30. října</span>
    <h1 class="fell" style="margin:0;font-size:31px;line-height:1.1">Vítejte zpět. Mezitím jste došli do Kralup a dokončili druhou etapu.</h1>
  </div>
  <div style="padding:16px 20px 0;display:flex;gap:10px">
    <div class="card" style="flex:1;padding:11px 14px"><div class="fell num" style="font-size:25px">11,4 km</div><div class="muted" style="font-size:12.5px">od posledně, 3 dny</div></div>
    <div class="card" style="flex:1;padding:11px 14px"><div class="fell num" style="font-size:25px">{len(nova)} {"nová místa" if 2 <= len(nova) <= 4 else "nových míst"}</div><div class="muted" style="font-size:12.5px">na vaší trase</div></div>
  </div>
  <a href="Vyprava.dc.html" class="hero ph" style="display:block;margin:16px 20px 0;height:178px;border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;{foto(nz['id'])}">
    <div style="position:absolute;left:16px;right:16px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:10px">
      <div style="display:flex;flex-direction:column;gap:2px"><span class="sc amber" style="font-size:14px">Další zastávka</span><span class="fell" style="font-size:27px;line-height:1">{nz['nazev']}</span></div>
      <span class="fell num" style="font-size:27px;white-space:nowrap">{km(nz['km'] - USLO)} km</span>
    </div>
  </a>
  <div style="padding:16px 20px 0;display:flex;justify-content:space-between;align-items:baseline">
    <span style="font-weight:600;font-size:14px">Na dalších 5 km</span><span class="amber" style="font-size:13px;font-weight:600">{mist(count5)}</span>
  </div>
  <div style="padding:2px 20px 0;display:flex;flex-direction:column">{rows}</div>
  {nav('Domů')}
</div>'''
    return page('Domů', body)

# ---------------------------------------------------------------- 3 Výprava

def vyprava():
    view = 'vyprava-mapa'
    extra = ''
    labels = {'nelahozeves': 'right', 'veltrusy': 'right', 'levy-hradec': 'left', 'roztoky': 'left'}
    for m in MISTA:
        if not visible(view, m['id']):
            continue
        x, y = P(view, m['id'])
        if m['id'] == 'dvorak':
            x, y = x - 9, y + 12
        extra += marker(m, x, y, big=m['druh'] == 'zastavka', label=m['nazev'] if m['id'] in labels else None,
                        label_side=labels.get(m['id'], 'right'))
    extra += you(*P(view, 'vy')) + rose(340, 560, .95)
    e = stav['etapy']
    segs = ''.join(
        f'<div style="flex:{x["do"] - x["od"]:.1f};height:5px;border-radius:3px;background:'
        + ('#E7A44B' if i < ETAPA else (f'linear-gradient(90deg,#E7A44B {max(2, (USLO - x["od"]) / (x["do"] - x["od"]) * 100):.0f}%,#2E3D42 0)' if i == ETAPA else '#2E3D42'))
        + '"></div>' for i, x in enumerate(e))
    et = e[ETAPA]
    v_etape = [m for m in MISTA if et['od'] < m['km'] <= et['do']]
    nz = DALSI_Z
    nobj = next(m for m in pred if m['druh'] == 'objev')
    body = f'''<div class="fa">
  {parch_map(view, extra, 'position:absolute;inset:0', attr=False)}
  <span class="attr" style="bottom:252px">© OpenStreetMap</span>
  <div style="position:absolute;left:12px;right:12px;top:52px;z-index:2;background:rgba(15,26,30,.92);border-radius:14px;padding:11px 14px;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="fell" style="font-size:21px">{data['vyprava']}</span><span class="num amber" style="font-weight:600;font-size:13px">{km(USLO)} / {km(DELKA, 0)} km</span></div>
    <div style="display:flex;gap:4px">{segs}</div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px" class="muted"><span>Etapa {ETAPA + 1} ze {len(e)} · {len(v_etape)} míst na {km(et['do'] - et['od'])} km</span><span>Skutečná trasa podél řeky</span></div>
  </div>
  <div style="position:absolute;right:12px;top:170px;z-index:2;display:flex;flex-direction:column;gap:8px">
    <span style="width:38px;height:38px;border-radius:10px;background:rgba(15,26,30,.88);display:flex;align-items:center;justify-content:center;font-size:20px">+</span>
    <span style="width:38px;height:38px;border-radius:10px;background:rgba(15,26,30,.88);display:flex;align-items:center;justify-content:center;font-size:20px">−</span>
    <span style="width:38px;height:38px;border-radius:10px;background:rgba(15,26,30,.88);display:flex;align-items:center;justify-content:center;font-size:16px">◎</span>
  </div>
  <div style="position:absolute;left:12px;right:12px;bottom:96px;z-index:2;background:#0F1A1E;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 24px rgba(0,0,0,.4)">
    <a href="Zastavka.dc.html" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit">
      <div class="ph" style="width:66px;height:66px;border-radius:12px;flex:none;{foto(nz['id'])}"></div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px"><span class="sc amber" style="font-size:13.5px">Další zastávka</span><span class="fell" style="font-size:22px;line-height:1.05">{nz['nazev']}</span><span class="muted" style="font-size:12px">dojdete zítra při běžné chůzi</span></div>
      <span class="fell num" style="font-size:25px;white-space:nowrap">{km(nz['km'] - USLO)} km</span>
    </a>
    <div class="rule"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px"><span><span class="muted">Malý objev za {km(nobj['km'] - USLO)} km:</span> {nobj['nazev']}</span><span class="gold">›</span></div>
  </div>
  {nav('Výprava')}
</div>'''
    return page('Výprava', body, '.fa .nav{position:absolute;left:0;right:0;bottom:0}')

# ---------------------------------------------------------------- 4 Zastávka

def zastavka():
    m = BY['levy-hradec']
    view = 'zastavka-mapa'
    extra = ''
    for o in MISTA:
        if visible(view, o['id'], 4):
            x, y = P(view, o['id'])
            extra += marker(o, x, y, label=o['nazev'] if o['id'] == m['id'] else None, label_side='right')
    body = f'''<div class="fa">
  <div class="hero ph strong" style="height:262px;{foto(m['id'])}">
    <div class="topbar"><a href="Vyprava.dc.html" style="color:inherit;text-decoration:none">‹ Mapa</a><span>Zastávka · km {km(m['km'])}</span></div>
    <div style="position:absolute;left:20px;right:20px;bottom:10px;display:flex;flex-direction:column;gap:6px">
      <span class="eyebrow">Etapa 2 · objeveno 23. 10.</span>
      <h1 class="fell" style="margin:0;font-size:40px;line-height:1">{m['nazev']}</h1>
    </div>
  </div>
  <div style="padding:6px 20px 0;display:flex;flex-direction:column;gap:12px">
    <p style="margin:0;font-size:15px;line-height:1.5;color:#E3E7E4">Na ostrožně nad Vltavou stávalo jedno z nejstarších hradišť přemyslovských Čech. Podle tradice tu kníže Bořivoj postavil první křesťanský kostel v zemi. Dnešní kostel sv. Klimenta stojí na stejném místě.</p>
    <div style="border-top:3px double #E2B86299;border-bottom:3px double #E2B86299;padding:10px 0;display:flex;flex-direction:column;gap:4px">
      <span class="sc gold" style="font-size:14px">Překvapivý fakt</span>
      <span class="fell" style="font-size:17px;line-height:1.3">Roku 982 tu byl zvolen pražským biskupem Vojtěch, pozdější svatý.</span>
    </div>
    <div style="display:flex;gap:12px;align-items:center">
      <div class="dot on" style="width:40px;height:40px">✓</div>
      <div style="display:flex;flex-direction:column;gap:1px;font-size:13.5px"><span style="font-weight:600">Uloženo do deníku 23. 10. 2026</span><span class="muted">Ten den jste ušli 9 846 kroků, 7,1 km.</span></div>
    </div>
    {parch_map(view, extra, f'border-radius:4px;clip-path:{torn(358, 132, seed=5)}')}
    <div style="display:flex;flex-direction:column;gap:3px;font-size:12.5px" class="muted">
      <span>Patří do kapitoly <span style="color:#F2EEE6">Počátky českého státu</span>, 2 ze 4 míst.</span>
      <span>2 nezávislé zdroje · ověřeno 30. 10. 2026 · foto Miaow Miaow, volné dílo</span>
    </div>
  </div>
  <div style="margin-top:auto;padding:0 20px 30px;display:flex;gap:10px">
    <a href="Vyprava.dc.html" class="btn pri" style="flex:1">Zpět na mapu</a>
    <a href="#zdroje" class="btn sec" style="flex:1">Zdroje</a>
  </div>
</div>'''
    return page(m['nazev'], body)

# ---------------------------------------------------------------- 5 Kronika

def kronika():
    years = [620, 890, 1010, 1130, 1460, 1590, 1380, 1420, 1510, 1540, 1650]
    mx = max(years)
    bars = ''.join(
        f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:{v / mx * 74:.0f}px;border-radius:3px 3px 0 0;background:{"#E7A44B" if i == len(years) - 1 else "#E2B86255"}"></div><span class="muted" style="font-size:10px">{16 + i}</span></div>'
        for i, v in enumerate(years))
    b = mapy['views']['svet-kronika']['body']
    px, py = b['praha']; tx, ty = b['tokio']; zx, zy = b['zivot']
    extra = (f'<circle cx="{px}" cy="{py}" r="4" fill="{RED}" stroke="#F3E6C4" stroke-width="1.4"/>'
             f'<path d="M{tx} {ty} v-14 l9 3.5 -9 3.5" fill="{RED}" stroke="{INK}" stroke-width=".8"/>'
             + you(zx - 6, zy))
    found = [m for m in objeveno if m['id'] in FOTO]
    meds = ''.join(f'<div class="med" style="width:46px;height:46px;{foto(m["id"])}"><span class="seal">✓</span></div>' for m in found)
    body = f'''<div class="fa">
  <div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:12px">
    <h1 class="fell" style="margin:0;font-size:34px">Kronika</h1>
    <div style="display:flex;gap:18px;font-size:14px;border-bottom:1px solid #1F2E33"><span style="padding-bottom:8px;border-bottom:2px solid #E7A44B;font-weight:600">Statistiky</span><span class="muted">Životní cesta</span><span class="muted">Výpravy</span></div>
  </div>
  <div style="padding:14px 20px 0;display:flex;align-items:baseline;justify-content:space-between">
    <div><span class="fell num" style="font-size:44px">14 200</span> <span class="fell" style="font-size:20px">km</span></div><span class="muted" style="font-size:13px">celkem od roku 2016</span>
  </div>
  <div style="padding:10px 20px 0;display:flex;align-items:flex-end;gap:5px;height:96px">{bars}</div>
  <div style="padding:12px 20px 0;display:flex;gap:8px">
    <div class="card" style="flex:1;padding:9px 11px"><div class="fell num" style="font-size:21px">1 650 km</div><div class="muted" style="font-size:11.5px">letos do října</div></div>
    <div class="card" style="flex:1;padding:9px 11px"><div class="fell num" style="font-size:21px">3 912</div><div class="muted" style="font-size:11.5px">dní se záznamem</div></div>
    <div class="card" style="flex:1;padding:9px 11px"><div class="fell num" style="font-size:21px">24 km</div><div class="muted" style="font-size:11.5px">nejdelší den</div></div>
  </div>
  <div style="padding:16px 20px 0;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="sc gold" style="font-size:15px">Životní cesta · Tichý oceán</span><span class="num" style="font-size:13px;font-weight:600">5 100 z 8 300 km</span></div>
    {parch_map('svet-kronika', extra, f'clip-path:{torn(358, 150, seed=8)}')}
    <span class="muted" style="font-size:12.5px">Ještě 3 200 km do San Franciska. Při vašem tempu zhruba za 19 měsíců. Ověřeno 85 %, odhad z kroků 15 %.</span>
  </div>
  <div style="padding:14px 20px 0;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-weight:600;font-size:14px">Objevená místa</span><span class="amber" style="font-size:13px;font-weight:600">{mist(len(objeveno))}</span></div>
    <div style="display:flex;gap:16px;align-items:center">{meds}<span class="muted" style="font-size:13px">+ {len(objeveno) - len(found)}</span></div>
  </div>
  {nav('Kronika')}
</div>'''
    return page('Kronika', body)

# ---------------------------------------------------------------- 6 Konec etapy

def pohlednice():
    i = 1
    et = stav['etapy'][i]
    v = [m for m in MISTA if et['od'] < m['km'] <= et['do']]
    nz = sum(1 for m in v if m['druh'] == 'zastavka'); no = len(v) - nz
    view = 'pohlednice-etapa'
    extra = ''
    for m in v + [BY['roztoky']]:
        if visible(view, m['id'], 4):
            x, y = P(view, m['id'])
            extra += marker(m, x, y)
    extra += rose(296, 122, .6)
    body = f'''<div class="fa">
  <div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:6px">
    <span class="eyebrow">Etapa 2 ze 4 dokončena</span>
    <h1 class="fell" style="margin:0;font-size:31px;line-height:1.08">Z Roztok do Kralup údolím pod hradišti</h1>
  </div>
  <div style="margin:18px 22px 0;background:#F4EEDF;padding:9px;transform:rotate(-1.6deg);box-shadow:0 10px 22px rgba(0,0,0,.45);position:relative">
    <div class="ph" style="height:196px;{foto('levy-hradec')};position:relative">
      <span class="fell" style="position:absolute;left:12px;bottom:8px;font-size:30px;font-style:italic;color:#FFFFFF;text-shadow:0 2px 8px rgba(0,0,0,.6)">Pozdrav z údolí Vltavy</span>
    </div>
    <div style="position:absolute;right:16px;top:16px;width:58px;height:70px;background:#F4EEDF;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:rotate(4deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;outline:2px dashed #C9BC9E;outline-offset:-3px">
      <span class="fell" style="font-size:22px;color:#9B2C22;line-height:1">II</span><span style="font-size:8.5px;color:#3A2A1C;letter-spacing:.08em;text-transform:uppercase">etapa</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 2px 0;color:#3A2A1C;font-size:12px">
      <span class="fell" style="font-size:15px;font-style:italic">Vltavská stezka</span><span>22.–30. 10. 2026</span>
    </div>
  </div>
  {parch_map(view, extra, f'margin:18px auto 0;clip-path:{torn(322, 150, seed=11)}')}
  <div style="padding:14px 22px 0;display:flex;justify-content:space-between;text-align:center">
    <div><div class="fell num" style="font-size:24px">{km(et['do'] - et['od'])} km</div><div class="muted" style="font-size:11.5px">ušlo</div></div>
    <div><div class="fell num" style="font-size:24px">8 dní</div><div class="muted" style="font-size:11.5px">vlastním tempem</div></div>
    <div><div class="fell num" style="font-size:24px">{nz}</div><div class="muted" style="font-size:11.5px">zastávky</div></div>
    <div><div class="fell num" style="font-size:24px">{no}</div><div class="muted" style="font-size:11.5px">objevů</div></div>
  </div>
  <div style="margin-top:auto;padding:0 20px 30px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;gap:10px"><a href="#share" class="btn pri" style="flex:1">Sdílet pohlednici</a><a href="Vyprava.dc.html" class="btn sec" style="flex:1">Na etapu 3</a></div>
    <div class="card" style="padding:11px 14px;display:flex;align-items:center;gap:12px">
      <div style="flex:1;display:flex;flex-direction:column;gap:1px"><span style="font-size:14px;font-weight:600">Upozornit vás na události?</span><span class="muted" style="font-size:12px">Jen dosažení místa a konec etapy. Nikdy denně.</span></div>
      <span style="width:46px;height:28px;border-radius:14px;background:#2E3D42;position:relative;flex:none"><span style="position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:#9AA5A3"></span></span>
    </div>
  </div>
</div>'''
    return page('Konec etapy', body)

# ---------------------------------------------------------------- 7 Objevovat

def objevovat():
    view = 'objevovat-trasa'
    extra = you(*P(view, 'vy'))
    for mid in ('vysehrad', 'melnik'):
        x, y = P(view, mid)
        extra += f'<circle cx="{x}" cy="{y}" r="3.5" fill="{PAPER}" stroke="{INK}" stroke-width="1.2"/>'
    n_z = sum(1 for m in MISTA if m['druh'] == 'zastavka')
    cards = [
        ('krkonose', 'Horský hřeben', 'Zdarma', '78 km · 4 etapy · střední', 'Skutečná trasa', '46 míst'),
        ('melnik', 'Podél Labe', 'Balíček', '240 km · 12 etap · náročná', 'Zjednodušená trasa', '128 míst'),
        ('mesic', 'Cesta na Měsíc', 'Zdarma', '384 400 km · na roky', 'Symbolická cesta', 'milníky'),
    ]
    rows = ''.join(f'''<div class="card" style="display:flex;overflow:hidden;height:86px">
      <div class="ph" style="width:104px;flex:none;background-image:url('assets/foto-{f}.jpg')"></div>
      <div style="flex:1;min-width:0;padding:8px 12px;display:flex;flex-direction:column;gap:2px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px"><span class="fell" style="font-size:20px;line-height:1.05">{t}</span><span style="font-size:11px;font-weight:600;color:{"#7CC594" if p == "Zdarma" else "#E7A44B"}">{p}</span></div>
        <span class="muted" style="font-size:12.5px">{d}</span>
        <span style="font-size:12px"><span class="sc gold" style="font-size:12.5px">{ty}</span> · {n}</span>
      </div></div>''' for f, t, p, d, ty, n in cards)
    body = f'''<div class="fa">
  <div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:12px">
    <h1 class="fell" style="margin:0;font-size:34px">Objevovat</h1>
    <div style="display:flex;gap:6px;font-size:12.5px;white-space:nowrap">
      <span style="padding:6px 12px;border-radius:16px;background:#E7A44B;color:#0F1A1E;font-weight:600">Vše</span>
      <span style="padding:6px 11px;border-radius:16px;border:1px solid #2E3D42">Zdarma</span>
      <span style="padding:6px 11px;border-radius:16px;border:1px solid #2E3D42">Skutečné trasy</span>
      <span style="padding:6px 11px;border-radius:16px;border:1px solid #2E3D42">Do 100 km</span>
    </div>
  </div>
  <div style="padding:16px 20px 0;display:flex;flex-direction:column;gap:8px">
    <span class="sc gold" style="font-size:15px">Právě procházíte</span>
    <a href="Vyprava.dc.html" class="card" style="display:flex;overflow:hidden;text-decoration:none;color:inherit">
      <div class="hero ph" style="flex:1;min-width:0;height:150px;background-image:url('assets/foto-veltrusy.jpg')">
        <div style="position:absolute;left:12px;right:10px;bottom:10px;display:flex;flex-direction:column;gap:2px">
          <span class="fell" style="font-size:23px;line-height:1">{data['vyprava']}</span>
          <span style="font-size:12.5px;color:#D9DEDB">{km(USLO)} z {km(DELKA, 0)} km · etapa {ETAPA + 1} ze 4</span>
        </div>
      </div>
      {parch_map(view, extra, 'flex:none', attr=False)}
    </a>
    <span class="muted" style="font-size:12.5px">{n_z} zastávek a {len(MISTA) - n_z} malých objevů. Zbývá {len(pred)} míst, nejbližší za {km(pred[0]['km'] - USLO)} km.</span>
  </div>
  <div style="padding:14px 20px 0;display:flex;flex-direction:column;gap:8px">
    <span class="sc gold" style="font-size:15px">Další cesty</span>
    {rows}
  </div>
  <p class="muted" style="margin:10px 20px 0;font-size:12px">Rozjetou výpravu vždy dokončíte zdarma. Platí se jen za nové cesty.</p>
  {nav('Objevovat')}
</div>'''
    return page('Objevovat', body)

SCREENS = {'Main': karta, 'Domu': domu, 'Vyprava': vyprava, 'Zastavka': zastavka,
           'Kronika': kronika, 'Pohlednice': pohlednice, 'Objevovat': objevovat}

if __name__ == '__main__':
    for name, fn in SCREENS.items():
        (OUT / f'{name}.dc.html').write_text(fn())
        print(name)
    print(f'objeveno {len(objeveno)}, před vámi {len(pred)}, další zastávka {DALSI_Z["nazev"]} za {km(DALSI_Z["km"] - USLO)} km')
