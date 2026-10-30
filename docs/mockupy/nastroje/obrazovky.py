"""Vygeneruje obrazovky *.dc.html ze stavu výpravy, míst a vykreslených map.

    python3 obrazovky.py

Světlý režim (výchozí) se ukládá jako Nazev.dc.html, tmavý jako Nazev-noc.dc.html.
Karta života a pohlednice existují jen světlé, protože se sdílí jako obrázek.
Čte mista.json, stav.json, trasa.json a ../assets/mapy.json (viz trasa.mjs).
Ruční úpravy obrazovek na plátně je potřeba přenést sem, jinak je další běh přepíše.
"""
import json
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
DALSI = next(m for m in pred if m['druh'] == 'zastavka')

# ---------------------------------------------------------------- témata

T = {
    'den': dict(bg='#EFE4CB', surface='#F8F1E1', ink='#2B2118', muted='#75644E', line='#D8C9A9', accent='#9B2C22',
                accentFg='#FBF5E8', ochre='#8E6320', nav='#F6EEDC', panel='rgba(248,241,225,.95)', tex=.55,
                track='#DCCDAE', lock='#B7A88E', seal='#9B2C22', sealFg='#F6E7C8', you='#9B2C22', free='#3E7D52', shadow='rgba(60,40,15,.22)'),
    'noc': dict(bg='#2B241C', surface='#372E24', ink='#F1E6D2', muted='#B5A68D', line='#4A3E31', accent='#C2522F',
                accentFg='#FFF4E6', ochre='#D9B068', nav='#241E17', panel='rgba(43,36,28,.95)', tex=.18,
                track='#4A3E31', lock='#6E6252', seal='#C2522F', sealFg='#FFF0DC', you='#E0704A', free='#8CCB9F', shadow='rgba(0,0,0,.4)'),
}
SUFFIX = {'den': '', 'noc': '-noc'}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC'
         '&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">')

PAPER_TEX = ("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='390' height='844'>"
             "<filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.014' numOctaves='4' seed='9'/>"
             "<feColorMatrix values='0 0 0 0 .62  0 0 0 0 .48  0 0 0 0 .26  0 0 0 .9 -.25'/></filter>"
             "<rect width='100%25' height='100%25' filter='url(%23p)' opacity='{op}'/></svg>")

def css(t):
    c = T[t]
    tex = PAPER_TEX.format(op=c['tex'])
    return f"""
body{{margin:0;font-family:'Work Sans',system-ui,sans-serif}}
.fa{{--bg:{c['bg']};--surface:{c['surface']};--ink:{c['ink']};--muted:{c['muted']};--line:{c['line']};--accent:{c['accent']};--accent-fg:{c['accentFg']};--ochre:{c['ochre']};--nav:{c['nav']};--panel:{c['panel']};--track:{c['track']};--lock:{c['lock']};--seal:{c['seal']};--seal-fg:{c['sealFg']};--free:{c['free']};--shadow:{c['shadow']}}}
.fa{{width:390px;height:844px;box-sizing:border-box;background:var(--bg) url("{tex}");background-blend-mode:multiply;color:var(--ink);position:relative;overflow:hidden;display:flex;flex-direction:column;font-family:'Work Sans',system-ui,sans-serif}}
.fa *{{box-sizing:border-box}}
.fell{{font-family:'IM Fell English',Georgia,serif;font-weight:400}}
.sc{{font-family:'IM Fell English SC',Georgia,serif;font-weight:400;letter-spacing:.05em;color:var(--ochre)}}
.muted{{color:var(--muted)}}
.num{{font-variant-numeric:tabular-nums}}
.melt{{position:absolute;left:0;right:0;top:0;background-size:cover;background-position:center;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 18%,#000 44%,transparent 80%);mask-image:linear-gradient(180deg,transparent 0,#000 18%,#000 44%,transparent 80%)}}
.edges{{-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}}
.soft{{-webkit-mask-image:radial-gradient(ellipse 72% 70% at 50% 50%,#000 62%,transparent 100%);mask-image:radial-gradient(ellipse 72% 70% at 50% 50%,#000 62%,transparent 100%)}}
.top{{position:relative;padding:54px 20px 0;display:flex;justify-content:space-between;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:600}}
.top a{{color:inherit;text-decoration:none}}
.eyebrow{{display:flex;align-items:center;gap:8px;font-family:'IM Fell English SC',Georgia,serif;font-size:15px;letter-spacing:.06em;color:var(--ochre)}}
.eyebrow::before,.eyebrow::after{{content:"";height:1px;width:20px;background:var(--ochre);opacity:.7}}
.card{{background:var(--surface);border:1px solid var(--line);border-radius:14px}}
.med{{border-radius:50%;flex:none;background-size:cover;background-position:center;border:1.5px solid var(--ochre);outline:1px solid var(--line);outline-offset:3px;position:relative}}
.badge{{position:absolute;right:-6px;bottom:-5px;width:20px;height:20px;background:var(--seal);color:var(--seal-fg);font-size:11px;display:flex;align-items:center;justify-content:center;clip-path:polygon(50% 0,61% 10%,75% 5%,79% 20%,95% 25%,90% 39%,100% 50%,90% 61%,95% 75%,79% 80%,75% 95%,61% 90%,50% 100%,39% 90%,25% 95%,21% 80%,5% 75%,10% 61%,0 50%,10% 39%,5% 25%,21% 20%,25% 5%,39% 10%)}}
.dot{{width:40px;height:40px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;border:1.5px dashed var(--lock);color:var(--muted)}}
.seal{{width:36px;height:36px;flex:none;background:var(--seal);color:var(--seal-fg);display:flex;align-items:center;justify-content:center;font-size:14px;clip-path:polygon(50% 0,61% 10%,75% 5%,79% 20%,95% 25%,90% 39%,100% 50%,90% 61%,95% 75%,79% 80%,75% 95%,61% 90%,50% 100%,39% 90%,25% 95%,21% 80%,5% 75%,10% 61%,0 50%,10% 39%,5% 25%,21% 20%,25% 5%,39% 10%)}}
.rule{{height:1px;background:var(--line)}}
.btn{{display:block;text-align:center;text-decoration:none;font-weight:600;font-size:16px;padding:15px;border-radius:14px}}
.btn.pri{{background:var(--accent);color:var(--accent-fg)}}
.btn.sec{{border:1.5px solid var(--line);color:var(--ink)}}
.map{{position:relative;overflow:hidden;flex:none}}
.map img{{display:block;width:100%;height:100%}}
.map svg{{position:absolute;inset:0;width:100%;height:100%}}
.attr{{position:absolute;right:8px;bottom:5px;font-size:9px;color:var(--muted)}}
.nav{{display:flex;justify-content:space-around;padding:10px 6px 30px;font-size:12px;flex:none;margin-top:auto;background:var(--nav);color:var(--muted);border-top:1px solid var(--line)}}
.nav a{{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 0;text-decoration:none;color:inherit}}
.nav a.on{{color:var(--accent);font-weight:600}}
"""

SVG_DEFS = """<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <clipPath id="kruh" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>
</defs></svg>"""

ICONS = {
    'Domů': '<path d="M4 11l8-7 8 7v9H4z"/>',
    'Výprava': '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z M9 4v14 M15 6v14"/>',
    'Objevovat': '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    'Kronika': '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z M5 17a3 3 0 013-3h11"/>',
}
NAV = {'Domů': 'Domu', 'Výprava': 'Vyprava', 'Objevovat': 'Objevovat', 'Kronika': 'Kronika'}

def href(name, t):
    return f'{name}{SUFFIX[t]}.dc.html'

def nav(active, t):
    items = ''.join(
        f'<a href="{href(NAV[k], t)}" class="{"on" if k == active else ""}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" '
        f'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{v}</svg>{k}</a>'
        for k, v in ICONS.items())
    return f'<nav class="nav">{items}</nav>'

def page(title, t, body, extra_css=''):
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
<style>{css(t)}{extra_css}</style>
</helmet>
{SVG_DEFS}
<div class="fa">
{body}
</div>
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

# ---------------------------------------------------------------- mapy

def marker(t, m, x, y, big=False, label=None, side='right'):
    """Zastávka s fotkou = medailon, bez fotky = kruh s věží; malý objev = pečeť (objeveno) nebo prázdný bod."""
    c = T[t]; done = m['km'] <= USLO; nxt = m['id'] == DALSI['id']
    out = ''
    if m['druh'] == 'zastavka':
        r = 17 if big else 13
        ring = c['accent'] if nxt else (c['seal'] if done else c['ink'])
        if m['id'] in FOTO:
            gray = '' if (done or nxt) else ' style="filter:grayscale(1)"'
            out += (f'<circle cx="{x}" cy="{y}" r="{r + 2}" fill="{c["surface"]}" stroke="{ring}" stroke-width="{2.6 if nxt else 1.8}"/>'
                    f'<image href="assets/foto-{m["id"]}.jpg" x="{x - r + 1}" y="{y - r + 1}" width="{2 * r - 2}" height="{2 * r - 2}" '
                    f'clip-path="url(#kruh)" preserveAspectRatio="xMidYMid slice"{gray}/>')
        else:
            out += (f'<circle cx="{x}" cy="{y}" r="{r - 4}" fill="{c["surface"]}" stroke="{ring}" stroke-width="1.8"/>'
                    f'<path d="M{x - 4} {y + 4} v-6 l2 -3 2 3 v-3 h4 v9 z" fill="{ring}"/>')
        if done:
            out += (f'<circle cx="{x + r * .7}" cy="{y + r * .7}" r="5.5" fill="{c["seal"]}"/>'
                    f'<path d="M{x + r * .7 - 2.5} {y + r * .7} l1.8 1.8 3.2 -3.4" stroke="{c["sealFg"]}" stroke-width="1.3" fill="none"/>')
    else:
        out += (f'<circle cx="{x}" cy="{y}" r="5.2" fill="{c["seal"]}" stroke="{c["surface"]}" stroke-width="1.6"/>' if done
                else f'<circle cx="{x}" cy="{y}" r="4.6" fill="{c["surface"]}" stroke="{c["ink"]}" stroke-width="1.3"/>')
    if label:
        w = len(label) * 6.1 + 12
        rr = (17 if big else 13) if m['druh'] == 'zastavka' else 6
        lx = x + rr + 7 if side == 'right' else x - rr - 7 - w
        out += (f'<rect x="{lx:.1f}" y="{y - 10}" width="{w:.1f}" height="20" rx="3" fill="{c["surface"]}" fill-opacity=".94" stroke="{c["line"]}"/>'
                f'<text x="{lx + 6:.1f}" y="{y + 4.2}" font-family="IM Fell English, serif" font-style="italic" font-size="12.5" fill="{c["ink"]}">{label}</text>')
    return out

def you(t, x, y):
    c = T[t]['you']
    return (f'<circle cx="{x}" cy="{y}" r="14" fill="{c}" opacity=".2"/>'
            f'<circle cx="{x}" cy="{y}" r="6.5" fill="{c}" stroke="#FFF6E6" stroke-width="2.4"/>')

def rose(t, cx, cy, s=1.0):
    c = T[t]; ink, red, bg = c['ink'], c['accent'], c['surface']
    return f'''<g transform="translate({cx} {cy}) scale({s})"><circle r="21" fill="{bg}" fill-opacity=".85" stroke="{ink}" stroke-width=".8"/><circle r="17" fill="none" stroke="{ink}" stroke-width=".5"/>
      <polygon points="0,-24 4,-4 24,0 4,4 0,24 -4,4 -24,0 -4,-4" fill="{ink}"/><polygon points="0,-24 4,-4 0,0 -4,-4" fill="{red}"/>
      <polygon points="14,-14 2,-2 -14,14 -2,2" fill="{ink}" opacity=".45"/><polygon points="-14,-14 -2,2 14,14 2,-2" fill="{ink}" opacity=".45"/>
      <text y="-28" text-anchor="middle" font-family="IM Fell English, serif" font-size="10" fill="{ink}">S</text></g>'''

def mapblock(t, view, extra, style='', cls='', attr=True):
    v = mapy['views'][view]; w, h = v['w'], v['h']
    a = '<span class="attr">© OpenStreetMap</span>' if attr else ''
    return (f'<div class="map {cls}" style="width:{w}px;height:{h}px;{style}"><img src="assets/mapa-{view}{SUFFIX[t]}.jpg" alt="">'
            f'<svg viewBox="0 0 {w} {h}" aria-hidden="true">{extra}</svg>{a}</div>')

def P(view, mid):
    return mapy['views'][view]['body'][mid]

def vis(view, mid, pad=8):
    v = mapy['views'][view]; x, y = v['body'][mid]
    return pad <= x <= v['w'] - pad and pad <= y <= v['h'] - pad

def medallion(m, size=40, badge=False):
    if m['id'] in FOTO:
        b = '<span class="badge">✓</span>' if badge else ''
        return f'<div class="med" style="width:{size}px;height:{size}px;{foto(m["id"])}">{b}</div>'
    if badge:
        return f'<div class="seal" style="width:{size}px;height:{size}px">✓</div>'
    return f'<div class="dot" style="width:{size}px;height:{size}px">·</div>'

# ---------------------------------------------------------------- 1 Karta života (jen světlá)

def karta(t='den'):
    c = T[t]
    b = mapy['views']['svet-karta']['body']
    px, py = b['praha']; tx, ty = b['tokio']; zx, zy = b['zivot']
    extra = (f'<circle cx="{px}" cy="{py}" r="4.5" fill="{c["seal"]}" stroke="{c["surface"]}" stroke-width="1.5"/>'
             f'<text x="{px + 2}" y="{py + 17}" font-family="IM Fell English, serif" font-style="italic" font-size="13" fill="{c["ink"]}">Praha</text>'
             f'<path d="M{tx} {ty} v-16 l10 4 -10 4" fill="{c["seal"]}" stroke="{c["ink"]}" stroke-width=".8"/>'
             f'<text x="{tx - 44}" y="{ty + 18}" font-family="IM Fell English, serif" font-style="italic" font-size="13" fill="{c["ink"]}">Tokio, 9 100 km</text>'
             + you(t, zx - 6, zy) + rose(t, 40, 178, .8))
    body = f'''<div style="padding:56px 24px 0;display:flex;justify-content:space-between;align-items:baseline">
    <span class="fell" style="font-size:22px">FootAtlas</span><span class="muted" style="font-size:13px">Načteno z Apple Health</span>
  </div>
  <div style="padding:24px 24px 0;display:flex;flex-direction:column;gap:6px">
    <span class="eyebrow">Za život jste ušli</span>
    <div style="display:flex;align-items:baseline;gap:10px"><span class="fell num" style="font-size:84px;line-height:.95">14 200</span><span class="fell" style="font-size:28px">km</span></div>
    <p style="margin:4px 0 0;font-size:17px;line-height:1.45">To je z Prahy až do Tokia a ještě 5 100 km dál, přes Tichý oceán.</p>
  </div>
  {mapblock(t, 'svet-karta', extra, 'margin:14px 24px 0', 'soft')}
  <div style="padding:14px 24px 0;display:flex;flex-direction:column;gap:9px">
    <div style="display:flex;justify-content:space-between;font-size:14px"><span style="font-weight:600">Z čeho se číslo skládá</span><span class="muted">od roku 2016</span></div>
    <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;gap:2px"><div style="flex:85;background:var(--accent)"></div><div style="flex:15;background:repeating-linear-gradient(135deg,var(--accent) 0 3px,var(--track) 3px 6px)"></div></div>
    <div style="display:flex;flex-direction:column;gap:4px;font-size:13.5px" class="num"><div style="display:flex;justify-content:space-between"><span>Ověřeno ze zdravotních dat</span><span>12 100 km</span></div><div class="muted" style="display:flex;justify-content:space-between"><span>Odhad z kroků</span><span>2 100 km</span></div></div>
  </div>
  <div style="margin-top:auto;padding:0 24px 34px;display:flex;flex-direction:column;gap:12px">
    <a href="Domu.dc.html" class="btn pri">Vybrat první výpravu</a>
    <a href="#share" class="btn sec">Sdílet kartu jako obrázek</a>
    <span class="muted" style="text-align:center;font-size:13px">Data zůstávají na vašem telefonu.</span>
  </div>'''
    return page('Karta života', t, body)

# ---------------------------------------------------------------- 2 Domů

def domu(t):
    rows = ''
    for m in [m for m in pred if m['km'] <= USLO + 5][:4]:
        z = m['druh'] == 'zastavka'
        rows += f'''<div style="display:flex;align-items:center;gap:14px;padding:8px 0">{medallion(m)}
      <div style="flex:1;min-width:0;display:flex;flex-direction:column"><span class="fell" style="font-size:18px;line-height:1.15">{m['nazev']}</span><span class="muted" style="font-size:12.5px">{'Zastávka' if z else 'Malý objev'} · km {km(m['km'])}</span></div>
      <span class="num" style="font-weight:600;font-size:15px;white-space:nowrap">{km(m['km'] - USLO)} km</span></div>'''
    n5 = len([m for m in pred if m['km'] <= USLO + 5])
    body = f'''<div class="melt" style="height:372px;{foto(DALSI['id'])}"></div>
  <div class="top"><span>Čtvrtek 30. října</span><span>Den 18</span></div>
  <a href="{href('Vyprava', t)}" style="position:relative;margin-top:212px;padding:0 20px;display:flex;flex-direction:column;gap:3px;text-decoration:none;color:inherit">
    <span class="sc" style="font-size:15px">Další zastávka · {km(DALSI['km'] - USLO)} km</span>
    <span class="fell" style="font-size:38px;line-height:1">{DALSI['nazev']}</span>
    <span class="muted" style="font-size:13.5px">Dojdete zítra při běžné chůzi.</span>
  </a>
  <a href="Pohlednice.dc.html" class="card" style="position:relative;margin:16px 20px 0;padding:12px 14px;display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit">
    <div class="seal">✓</div>
    <span style="font-size:14px;line-height:1.4">Vítejte zpět. Od posledně jste ušli <b>11,4 km</b>, došli do Kralup a dokončili <b>2. etapu</b>.</span>
  </a>
  <div style="position:relative;padding:16px 20px 0;display:flex;justify-content:space-between;align-items:baseline">
    <span style="font-weight:600;font-size:14px">Na dalších 5 km</span><span style="font-size:13px;font-weight:600;color:var(--accent)">{mist(n5)}</span>
  </div>
  <div style="position:relative;padding:2px 20px 0;display:flex;flex-direction:column">{rows}</div>
  {nav('Domů', t)}'''
    return page('Domů' + (' · noc' if t == 'noc' else ''), t, body)

# ---------------------------------------------------------------- 3 Výprava

def vyprava(t):
    view = 'vyprava-mapa'; extra = ''
    labels = {'nelahozeves': 'right', 'veltrusy': 'right', 'levy-hradec': 'left', 'roztoky': 'left'}
    for m in MISTA:
        if not vis(view, m['id']):
            continue
        x, y = P(view, m['id'])
        if m['id'] == 'dvorak':
            x, y = x - 9, y + 12
        extra += marker(t, m, x, y, big=m['druh'] == 'zastavka', label=m['nazev'] if m['id'] in labels else None, side=labels.get(m['id'], 'right'))
    extra += you(t, *P(view, 'vy')) + rose(t, 340, 560, .95)
    e = stav['etapy']
    segs = ''.join(
        f'<div style="flex:{x["do"] - x["od"]:.1f};height:5px;border-radius:3px;background:'
        + ('var(--accent)' if i < ETAPA else (f'linear-gradient(90deg,var(--accent) {max(4, (USLO - x["od"]) / (x["do"] - x["od"]) * 100):.0f}%,var(--track) 0)' if i == ETAPA else 'var(--track)'))
        + '"></div>' for i, x in enumerate(e))
    et = e[ETAPA]; n_et = len([m for m in MISTA if et['od'] < m['km'] <= et['do']])
    nobj = next(m for m in pred if m['druh'] == 'objev')
    btn = 'width:38px;height:38px;border-radius:10px;background:var(--panel);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-size:19px'
    body = f'''{mapblock(t, view, extra, 'position:absolute;inset:0', attr=False)}
  <span class="attr" style="bottom:252px;right:14px">© OpenStreetMap</span>
  <div style="position:absolute;left:12px;right:12px;top:52px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:11px 14px;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="fell" style="font-size:21px">{data['vyprava']}</span><span class="num" style="font-weight:600;font-size:13px;color:var(--accent)">{km(USLO)} / {km(DELKA, 0)} km</span></div>
    <div style="display:flex;gap:4px">{segs}</div>
    <div class="muted" style="display:flex;justify-content:space-between;font-size:11.5px"><span>Etapa {ETAPA + 1} ze {len(e)} · {mist(n_et)} na {km(et['do'] - et['od'])} km</span><span>Skutečná trasa podél řeky</span></div>
  </div>
  <div style="position:absolute;right:12px;top:170px;display:flex;flex-direction:column;gap:8px"><span style="{btn}">+</span><span style="{btn}">−</span><span style="{btn};font-size:15px">◎</span></div>
  <div style="position:absolute;left:12px;right:12px;bottom:96px;background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 10px 24px var(--shadow)">
    <a href="{href('Zastavka', t)}" style="display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit">
      <div style="width:66px;height:66px;border-radius:12px;flex:none;background-size:cover;background-position:center;{foto(DALSI['id'])}"></div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column"><span class="sc" style="font-size:13.5px">Další zastávka</span><span class="fell" style="font-size:22px;line-height:1.05">{DALSI['nazev']}</span><span class="muted" style="font-size:12px">dojdete zítra při běžné chůzi</span></div>
      <span class="fell num" style="font-size:25px;white-space:nowrap">{km(DALSI['km'] - USLO)} km</span>
    </a>
    <div class="rule"></div>
    <div style="font-size:13px"><span class="muted">Malý objev za {km(nobj['km'] - USLO)} km:</span> {nobj['nazev']}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;display:flex">{nav('Výprava', t)}</div>'''
    return page('Výprava' + (' · noc' if t == 'noc' else ''), t, body, '.fa>div:last-child>.nav{flex:1}')

# ---------------------------------------------------------------- 4 Zastávka

def zastavka(t):
    m = BY['levy-hradec']; view = 'zastavka-mapa'; extra = ''
    for o in MISTA:
        if vis(view, o['id'], 4):
            x, y = P(view, o['id'])
            extra += marker(t, o, x, y, label=o['nazev'] if o['id'] == m['id'] else None)
    body = f'''<div class="melt" style="height:310px;{foto(m['id'])}"></div>
  <div class="top"><a href="{href('Vyprava', t)}">‹ Mapa</a><span>Zastávka · km {km(m['km'])}</span></div>
  <div style="position:relative;margin-top:148px;padding:0 20px;display:flex;flex-direction:column;gap:6px">
    <span class="eyebrow">Etapa 2 · objeveno 23. 10.</span>
    <h1 class="fell" style="margin:0;font-size:42px;line-height:1">{m['nazev']}</h1>
  </div>
  <div style="position:relative;padding:10px 20px 0;display:flex;flex-direction:column;gap:12px">
    <p style="margin:0;font-size:15px;line-height:1.5">Na ostrožně nad Vltavou stávalo jedno z nejstarších hradišť přemyslovských Čech. Podle tradice tu kníže Bořivoj postavil první křesťanský kostel v zemi. Dnešní kostel sv. Klimenta stojí na stejném místě.</p>
    <div style="border-top:3px double var(--ochre);border-bottom:3px double var(--ochre);padding:10px 0;display:flex;flex-direction:column;gap:4px">
      <span class="sc" style="font-size:14px">Překvapivý fakt</span>
      <span class="fell" style="font-size:17px;line-height:1.3">Roku 982 tu byl zvolen pražským biskupem Vojtěch, pozdější svatý.</span>
    </div>
    <div style="display:flex;gap:12px;align-items:center"><div class="seal">✓</div>
      <div style="display:flex;flex-direction:column;font-size:13.5px"><span style="font-weight:600">Uloženo do deníku 23. 10. 2026</span><span class="muted">Ten den jste ušli 9 846 kroků, 7,1 km.</span></div></div>
  </div>
  {mapblock(t, view, extra, 'margin:12px 16px 0', 'edges', attr=False)}
  <div class="muted" style="padding:6px 20px 0;font-size:12px;line-height:1.45">Kapitola Počátky českého státu, 2 ze 4 míst · 2 nezávislé zdroje · ověřeno 30. 10. 2026 · foto Miaow Miaow, volné dílo · mapa © OpenStreetMap</div>
  <div style="margin-top:auto;padding:0 20px 30px;display:flex;gap:10px"><a href="{href('Vyprava', t)}" class="btn pri" style="flex:1">Zpět na mapu</a><a href="#zdroje" class="btn sec" style="flex:1">Zdroje</a></div>'''
    return page(m['nazev'] + (' · noc' if t == 'noc' else ''), t, body)

# ---------------------------------------------------------------- 5 Kronika

def kronika(t):
    c = T[t]
    years = [620, 890, 1010, 1130, 1460, 1590, 1380, 1420, 1510, 1540, 1650]
    mx = max(years)
    bars = ''.join(
        f'<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;height:{v / mx * 70:.0f}px;border-radius:3px 3px 0 0;background:{"var(--accent)" if i == len(years) - 1 else "var(--track)"}"></div><span class="muted" style="font-size:10px">{16 + i}</span></div>'
        for i, v in enumerate(years))
    b = mapy['views']['svet-kronika']['body']
    px, py = b['praha']; tx, ty = b['tokio']; zx, zy = b['zivot']
    extra = (f'<circle cx="{px}" cy="{py}" r="4" fill="{c["seal"]}" stroke="{c["surface"]}" stroke-width="1.4"/>'
             f'<path d="M{tx} {ty} v-14 l9 3.5 -9 3.5" fill="{c["seal"]}" stroke="{c["ink"]}" stroke-width=".8"/>'
             + you(t, zx - 6, zy))
    found = [m for m in objeveno if m['id'] in FOTO]
    meds = ''.join(medallion(m, 46, badge=True) for m in found)
    card = 'flex:1;padding:9px 11px'
    body = f'''<div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:12px">
    <h1 class="fell" style="margin:0;font-size:34px">Kronika</h1>
    <div style="display:flex;gap:18px;font-size:14px;border-bottom:1px solid var(--line)"><span style="padding-bottom:8px;border-bottom:2px solid var(--accent);font-weight:600">Statistiky</span><span class="muted">Životní cesta</span><span class="muted">Výpravy</span></div>
  </div>
  <div style="padding:14px 20px 0;display:flex;align-items:baseline;justify-content:space-between">
    <div><span class="fell num" style="font-size:44px">14 200</span> <span class="fell" style="font-size:20px">km</span></div><span class="muted" style="font-size:13px">celkem od roku 2016</span>
  </div>
  <div style="padding:10px 20px 0;display:flex;align-items:flex-end;gap:5px;height:92px">{bars}</div>
  <div style="padding:12px 20px 0;display:flex;gap:8px">
    <div class="card" style="{card}"><div class="fell num" style="font-size:21px">1 650 km</div><div class="muted" style="font-size:11.5px">letos do října</div></div>
    <div class="card" style="{card}"><div class="fell num" style="font-size:21px">3 912</div><div class="muted" style="font-size:11.5px">dní se záznamem</div></div>
    <div class="card" style="{card}"><div class="fell num" style="font-size:21px">24 km</div><div class="muted" style="font-size:11.5px">nejdelší den</div></div>
  </div>
  <div style="padding:16px 20px 0;display:flex;flex-direction:column;gap:6px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="sc" style="font-size:15px">Životní cesta · Tichý oceán</span><span class="num" style="font-size:13px;font-weight:600">5 100 z 8 300 km</span></div>
    {mapblock(t, 'svet-kronika', extra, 'margin:0 -16px', 'soft', attr=False)}
    <span class="muted" style="font-size:12.5px">Ještě 3 200 km do San Franciska. Při vašem tempu zhruba za 19 měsíců. Ověřeno 85 %, odhad z kroků 15 %. Mapa © OpenStreetMap.</span>
  </div>
  <div style="padding:14px 20px 0;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="font-weight:600;font-size:14px">Objevená místa</span><span style="font-size:13px;font-weight:600;color:var(--accent)">{mist(len(objeveno))}</span></div>
    <div style="display:flex;gap:16px;align-items:center">{meds}<span class="muted" style="font-size:13px">+ {len(objeveno) - len(found)}</span></div>
  </div>
  {nav('Kronika', t)}'''
    return page('Kronika' + (' · noc' if t == 'noc' else ''), t, body)

# ---------------------------------------------------------------- 6 Konec etapy (jen světlá)

def pohlednice(t='den'):
    et = stav['etapy'][1]
    v = [m for m in MISTA if et['od'] < m['km'] <= et['do']]
    nz = sum(1 for m in v if m['druh'] == 'zastavka'); no = len(v) - nz
    view = 'pohlednice-etapa'; extra = ''
    for m in v + [BY['roztoky']]:
        if vis(view, m['id'], 4):
            x, y = P(view, m['id'])
            extra += marker(t, m, x, y)
    extra += rose(t, 290, 118, .6)
    stat = lambda n, l: f'<div><div class="fell num" style="font-size:24px">{n}</div><div class="muted" style="font-size:11.5px">{l}</div></div>'
    body = f'''<div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:6px">
    <span class="eyebrow">Etapa 2 ze 4 dokončena</span>
    <h1 class="fell" style="margin:0;font-size:31px;line-height:1.08">Z Roztok do Kralup údolím pod hradišti</h1>
  </div>
  <div style="margin:18px 22px 0;background:#FFFDF7;padding:9px;transform:rotate(-1.6deg);box-shadow:0 10px 22px var(--shadow);position:relative">
    <div style="height:196px;background-size:cover;background-position:center;{foto('levy-hradec')};position:relative">
      <span class="fell" style="position:absolute;left:12px;bottom:8px;font-size:30px;font-style:italic;color:#FFFFFF;text-shadow:0 2px 8px rgba(0,0,0,.6)">Pozdrav z údolí Vltavy</span>
    </div>
    <div style="position:absolute;right:16px;top:16px;width:58px;height:70px;background:#FFFDF7;padding:4px;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:rotate(4deg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;outline:2px dashed #C9BC9E;outline-offset:-3px">
      <span class="fell" style="font-size:22px;color:var(--accent);line-height:1">II</span><span style="font-size:8.5px;letter-spacing:.08em;text-transform:uppercase">etapa</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 2px 0;font-size:12px">
      <span class="fell" style="font-size:15px;font-style:italic">Vltavská stezka</span><span>22.–30. 10. 2026</span>
    </div>
  </div>
  {mapblock(t, view, extra, 'margin:14px auto 0', 'soft')}
  <div style="padding:8px 22px 0;display:flex;justify-content:space-between;text-align:center">
    {stat(km(et['do'] - et['od']) + ' km', 'ušlo')}{stat('8 dní', 'vlastním tempem')}{stat(nz, 'zastávky')}{stat(no, 'objevů')}
  </div>
  <div style="margin-top:auto;padding:0 20px 30px;display:flex;flex-direction:column;gap:10px">
    <div style="display:flex;gap:10px"><a href="#share" class="btn pri" style="flex:1">Sdílet pohlednici</a><a href="Vyprava.dc.html" class="btn sec" style="flex:1">Na etapu 3</a></div>
    <div class="card" style="padding:11px 14px;display:flex;align-items:center;gap:12px">
      <div style="flex:1;display:flex;flex-direction:column;gap:1px"><span style="font-size:14px;font-weight:600">Upozornit vás na události?</span><span class="muted" style="font-size:12px">Jen dosažení místa a konec etapy. Nikdy denně.</span></div>
      <span style="width:46px;height:28px;border-radius:14px;background:var(--track);position:relative;flex:none"><span style="position:absolute;left:3px;top:3px;width:22px;height:22px;border-radius:50%;background:var(--surface);box-shadow:0 1px 2px var(--shadow)"></span></span>
    </div>
  </div>'''
    return page('Konec etapy', t, body)

# ---------------------------------------------------------------- 7 Objevovat

def objevovat(t):
    c = T[t]
    view = 'objevovat-trasa'
    extra = you(t, *P(view, 'vy'))
    for mid in ('vysehrad', 'melnik'):
        x, y = P(view, mid)
        extra += f'<circle cx="{x}" cy="{y}" r="3.5" fill="{c["surface"]}" stroke="{c["ink"]}" stroke-width="1.2"/>'
    n_z = sum(1 for m in MISTA if m['druh'] == 'zastavka')
    cards = [
        ('krkonose', 'Horský hřeben', 'Zdarma', '78 km · 4 etapy · střední', 'Skutečná trasa', '46 míst'),
        ('melnik', 'Podél Labe', 'Balíček', '240 km · 12 etap · náročná', 'Zjednodušená trasa', '128 míst'),
        ('mesic', 'Cesta na Měsíc', 'Zdarma', '384 400 km · na roky', 'Symbolická cesta', 'milníky'),
    ]
    rows = ''.join(f'''<div class="card" style="display:flex;overflow:hidden;height:86px">
      <div style="width:104px;flex:none;background-size:cover;background-position:center;background-image:url('assets/foto-{f}.jpg')"></div>
      <div style="flex:1;min-width:0;padding:8px 12px;display:flex;flex-direction:column;gap:2px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px"><span class="fell" style="font-size:20px;line-height:1.05">{ti}</span><span style="font-size:11px;font-weight:600;color:{"var(--free)" if p == "Zdarma" else "var(--accent)"}">{p}</span></div>
        <span class="muted" style="font-size:12.5px">{d}</span>
        <span style="font-size:12px"><span class="sc" style="font-size:12.5px">{ty}</span> · {n}</span>
      </div></div>''' for f, ti, p, d, ty, n in cards)
    chip = 'padding:6px 11px;border-radius:16px;border:1px solid var(--line)'
    body = f'''<div style="padding:56px 20px 0;display:flex;flex-direction:column;gap:12px">
    <h1 class="fell" style="margin:0;font-size:34px">Objevovat</h1>
    <div style="display:flex;gap:6px;font-size:12.5px;white-space:nowrap">
      <span style="padding:6px 12px;border-radius:16px;background:var(--accent);color:var(--accent-fg);font-weight:600">Vše</span>
      <span style="{chip}">Zdarma</span><span style="{chip}">Skutečné trasy</span><span style="{chip}">Do 100 km</span>
    </div>
  </div>
  <div style="padding:16px 20px 0;display:flex;flex-direction:column;gap:8px">
    <span class="sc" style="font-size:15px">Právě procházíte</span>
    <a href="{href('Vyprava', t)}" class="card" style="display:flex;overflow:hidden;text-decoration:none;color:inherit">
      <div style="flex:1;min-width:0;display:flex;flex-direction:column">
        <div style="height:92px;background-size:cover;background-position:center 30%;background-image:url('assets/foto-veltrusy.jpg')"></div>
        <div style="padding:8px 12px;display:flex;flex-direction:column;gap:1px">
          <span class="fell" style="font-size:22px;line-height:1">{data['vyprava']}</span>
          <span class="muted num" style="font-size:12.5px">{km(USLO)} z {km(DELKA, 0)} km · etapa {ETAPA + 1} ze 4</span>
        </div>
      </div>
      {mapblock(t, view, extra, 'border-left:1px solid var(--line)', attr=False)}
    </a>
    <span class="muted" style="font-size:12.5px">{n_z} zastávek a {len(MISTA) - n_z} malých objevů. Zbývá {mist(len(pred))}, nejbližší za {km(pred[0]['km'] - USLO)} km.</span>
  </div>
  <div style="padding:14px 20px 0;display:flex;flex-direction:column;gap:8px">
    <span class="sc" style="font-size:15px">Další cesty</span>
    {rows}
  </div>
  <p class="muted" style="margin:10px 20px 0;font-size:12px">Rozjetou výpravu vždy dokončíte zdarma. Platí se jen za nové cesty.</p>
  {nav('Objevovat', t)}'''
    return page('Objevovat' + (' · noc' if t == 'noc' else ''), t, body)

SCREENS = [('Main', karta, ('den',)), ('Domu', domu, ('den', 'noc')), ('Vyprava', vyprava, ('den', 'noc')),
           ('Zastavka', zastavka, ('den', 'noc')), ('Kronika', kronika, ('den', 'noc')),
           ('Pohlednice', pohlednice, ('den',)), ('Objevovat', objevovat, ('den', 'noc'))]

if __name__ == '__main__':
    for name, fn, temata in SCREENS:
        for t in temata:
            (OUT / f'{name}{SUFFIX[t]}.dc.html').write_text(fn(t))
            print(f'{name}{SUFFIX[t]}')
    print(f'objeveno {len(objeveno)}, před vámi {len(pred)}, další zastávka {DALSI["nazev"]} za {km(DALSI["km"] - USLO)} km')
