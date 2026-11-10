#!/usr/bin/env python3
"""
Ikona aplikace v atlasovém vzhledu „Inkoust“: pergamen s vrstevnicemi a řekou, inkoustová trasa
(čárkovaný plán, pak červená ušlá část) a na jejím konci vosková pečeť se dvěma stopami.

Vytvoří SVG a vyrenderuje je bez okna v Google Chrome do apps/mobile/assets:
  icon.png                     1024 × 1024, iOS a výchozí (bez průhlednosti)
  android-icon-foreground.png  1024 × 1024, adaptivní ikona: trasa a pečeť v bezpečné zóně, průhledné pozadí
  android-icon-background.png  1024 × 1024, adaptivní ikona: papír, vrstevnice, řeka
  android-icon-monochrome.png  1024 × 1024, tematická ikona Androidu 13+: silueta pečeti se stopami
  favicon.png                  48 × 48, web

Použití: python3 tools/brand/make-icon.py   (barvy odpovídají packages/map-style/src/tokens.ts a Seal.tsx)
"""
import math
import os
import subprocess
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS = os.path.join(ROOT, "apps", "mobile", "assets")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

PAPER = "#EFE4CB"
WASH = "#F4E6C6"
PAPER_EDGE = "#E2D2AC"
PENCIL = "#B8AA90"
RIVER = "#8FB7B4"
RIVER_EDGE = "#4E7F80"
INK = "#3A2A1C"
ROUTE = "#9B2C22"
HALO = "#F3E6C4"
WAX = {"light": "#C2463A", "mid": "#9B2C22", "dark": "#6A1A13", "text": "#F6D9CF", "glint": "#E7A08F"}


def wavy_circle(cx: float, cy: float, r: float, n: int = 180) -> str:
    """Nepravidelný okraj vosku: kruh s jemnými vlnami (stejný princip jako tvar pečeti v Seal.tsx)."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        k = 1 + 0.035 * math.sin(9 * t + 0.4) + 0.018 * math.sin(23 * t + 1.3) + 0.01 * math.sin(41 * t)
        pts.append(f"{cx + r * k * math.cos(t):.1f},{cy + r * k * math.sin(t):.1f}")
    return "M" + " L".join(pts) + " Z"


def footprint(x: float, y: float, s: float, angle: float, mirror: bool, fill: str) -> str:
    """Jedna stopa: chodidlo a pět prstů. `s` je délka chodidla, `angle` natočení ve stupních."""
    m = -1 if mirror else 1
    toes = [(-0.13, -0.63, 0.085), (0.01, -0.67, 0.062), (0.12, -0.63, 0.054), (0.21, -0.56, 0.047), (0.27, -0.47, 0.041)]
    parts = [
        # Chodidlo: širší špička, užší pata.
        f'<path d="M 0.02 -0.52 C 0.24 -0.53 0.29 -0.26 0.22 -0.04 C 0.16 0.14 0.17 0.36 0.10 0.50 '
        f'C 0.04 0.60 -0.11 0.58 -0.13 0.44 C -0.15 0.30 -0.10 0.12 -0.14 -0.08 C -0.19 -0.34 -0.13 -0.51 0.02 -0.52 Z" />'
    ]
    for tx, ty, tr in toes:
        parts.append(f'<circle cx="{tx}" cy="{ty}" r="{tr}" />')
    return (
        f'<g transform="translate({x} {y}) rotate({angle}) scale({m * s} {s})" fill="{fill}">' + "".join(parts) + "</g>"
    )


def seal(cx: float, cy: float, r: float, mono: bool = False) -> str:
    """Vosková pečeť: tělo s přechodem, vnitřní vtisknutý kruh a dvě stopy."""
    ink = "#000" if mono else WAX["text"]
    # Nezrcadlená stopa má palec vlevo (pravá noha); zrcadlená levá stojí vlevo níž, pravá vpravo o krok výš.
    feet = footprint(cx - 0.20 * r, cy + 0.16 * r, 0.66 * r, -8, True, ink) + footprint(cx + 0.21 * r, cy - 0.14 * r, 0.66 * r, 8, False, ink)
    if mono:
        # Silueta: pečeť bílá, stopy a vnitřní kruh vyříznuté maskou.
        return (
            f'<mask id="m"><rect width="1024" height="1024" fill="#fff"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{0.80 * r}" fill="none" stroke="#000" stroke-width="{0.035 * r}"/>{feet}</mask>'
            f'<path d="{wavy_circle(cx, cy, r)}" fill="#fff" mask="url(#m)"/>'
        )
    return f"""
    <defs>
      <radialGradient id="wax" cx="38%" cy="32%" r="75%">
        <stop offset="0" stop-color="{WAX['light']}"/>
        <stop offset="0.55" stop-color="{WAX['mid']}"/>
        <stop offset="1" stop-color="{WAX['dark']}"/>
      </radialGradient>
      <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="{0.05 * r}" stdDeviation="{0.06 * r}" flood-color="#3A1A10" flood-opacity="0.35"/>
      </filter>
    </defs>
    <path d="{wavy_circle(cx, cy, r)}" fill="url(#wax)" filter="url(#shadow)"/>
    <circle cx="{cx}" cy="{cy}" r="{0.80 * r}" fill="none" stroke="{WAX['dark']}" stroke-opacity="0.55" stroke-width="{0.05 * r}"/>
    <circle cx="{cx}" cy="{cy}" r="{0.80 * r}" fill="none" stroke="{WAX['text']}" stroke-opacity="0.55" stroke-width="{0.02 * r}"/>
    <path d="M {cx - 0.62 * r} {cy - 0.38 * r} A {0.74 * r} {0.74 * r} 0 0 1 {cx - 0.05 * r} {cy - 0.74 * r}"
          fill="none" stroke="{WAX['glint']}" stroke-opacity="0.55" stroke-width="{0.05 * r}" stroke-linecap="round"/>
    {feet}
    """


# Trasa: z levého dolního rohu podél řeky k pečeti; první část je plán (čárkovaná), druhá ušlá (červená).
PLAN = "M 70 1000 C 120 920 110 860 180 810"
DONE = "M 180 810 C 260 750 230 680 330 650 C 420 622 470 640 540 590"


def background() -> str:
    contours = "".join(
        f'<path d="M {-40} {y} C 260 {y - 90} 520 {y + 70} 1080 {y - 40}" fill="none" stroke="{PENCIL}" '
        f'stroke-opacity="0.45" stroke-width="5"/>'
        for y in (150, 245, 865, 945)
    )
    return f"""
    <defs>
      <radialGradient id="paper" cx="45%" cy="40%" r="80%">
        <stop offset="0" stop-color="{WASH}"/>
        <stop offset="0.7" stop-color="{PAPER}"/>
        <stop offset="1" stop-color="{PAPER_EDGE}"/>
      </radialGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#paper)"/>
    {contours}
    <path d="M 1100 330 C 900 380 820 250 640 300 C 470 350 420 470 300 470 C 160 470 90 400 -60 430"
          fill="none" stroke="{RIVER}" stroke-width="64" stroke-linecap="round" opacity="0.85"/>
    <path d="M 1100 330 C 900 380 820 250 640 300 C 470 350 420 470 300 470 C 160 470 90 400 -60 430"
          fill="none" stroke="{RIVER_EDGE}" stroke-width="4" stroke-opacity="0.5" transform="translate(0 30)"/>
    """


def route() -> str:
    return f"""
    <path d="{PLAN}" fill="none" stroke="{HALO}" stroke-width="34" stroke-linecap="round"/>
    <path d="{PLAN}" fill="none" stroke="{INK}" stroke-width="18" stroke-linecap="round" stroke-dasharray="34 30"/>
    <path d="{DONE}" fill="none" stroke="{HALO}" stroke-width="40" stroke-linecap="round"/>
    <path d="{DONE}" fill="none" stroke="{ROUTE}" stroke-width="24" stroke-linecap="round"/>
    """


def svg(body: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">{body}</svg>'


# Pečeť v plné ikoně: velká, mírně vpravo nahoře, trasa k ní přichází zleva zdola.
FULL = svg(background() + route() + seal(640, 410, 270))
# Adaptivní ikona Androidu ořezává do kruhu nebo squircle; bezpečná zóna je vnitřních 66 % (průměr ~676 px).
FOREGROUND = svg(f'<g transform="translate(512 512) scale(0.74) translate(-470 -560)">{route()}{seal(640, 410, 270)}</g>')
BACKGROUND = svg(background())
MONO = svg(f'<g transform="translate(512 512) scale(0.66) translate(-512 -512)">{seal(512, 512, 330, mono=True)}</g>')


def render(markup: str, out: str, size: int, transparent: bool) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, "icon.html")
        bg = "transparent" if transparent else PAPER
        with open(html, "w") as f:
            f.write(f'<html><body style="margin:0;background:{bg}">{markup}</body></html>')
        shot = os.path.join(tmp, "shot.png")
        args = [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--screenshot={shot}", "--window-size=1024,1024"]
        if transparent:
            args.append("--default-background-color=00000000")
        subprocess.run(args + [f"file://{html}"], check=True, capture_output=True)
        im = Image.open(shot).convert("RGBA" if transparent else "RGB").crop((0, 0, 1024, 1024))
        if size != 1024:
            im = im.resize((size, size), Image.LANCZOS)
        im.save(out)
        print("→", os.path.relpath(out, ROOT), im.size, im.mode)


if __name__ == "__main__":
    render(FULL, os.path.join(ASSETS, "icon.png"), 1024, transparent=False)
    render(FOREGROUND, os.path.join(ASSETS, "android-icon-foreground.png"), 1024, transparent=True)
    render(BACKGROUND, os.path.join(ASSETS, "android-icon-background.png"), 1024, transparent=False)
    render(MONO, os.path.join(ASSETS, "android-icon-monochrome.png"), 1024, transparent=True)
    render(FULL, os.path.join(ASSETS, "favicon.png"), 48, transparent=False)
