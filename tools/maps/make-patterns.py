#!/usr/bin/env python3
"""Vyrobí vzory výplní mapy (čtverečky zástavby, stromy, vinice, šrafy) jako dlaždice PNG @3x.

Předloha: SVG `pattern` z docs/mockupy/Vyprava.dc.html (blkS/blkI, treS/treI, vinI). Skica (`*-sketch`) je jen
tužkový obrys bez výplně, kolorovaná (`*-ink`) má barevné pozadí a výplň. Barvy dne jsou z prototypu, noční jsou
odvozené (viz `AtlasPalette` v packages/map-style/src/tokens.ts, kde jsou barvy stejné).

Výstup: apps/mobile/assets/map/patterns/<den|noc>-<vzor>@3x.png a src/map/patternFiles.ts.
Názvy vzorů (bez předpony dne a noci) musí odpovídat `ATLAS_PATTERNS` v packages/map-style/src/atlas.ts (hlídá test).
Spuštění: python3 tools/maps/make-patterns.py (potřebuje Pillow).
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "apps", "mobile", "assets", "map", "patterns")
INDEX = os.path.join(ROOT, "apps", "mobile", "src", "map", "patternFiles.ts")
S = 3  # @3x
SS = 8  # nadvzorkování

COLORS = {
    "day": dict(pencil="#9A8C74", blk_bg="#EBD5AE", blk_box="#D6A877", blk_line="#8C5E3A", tree_bg="#C9D3A0",
                tree_crown="#6F9455", tree_line="#3F5E32", trunk="#5E4A32", vine_bg="#D9D39A", vine_line="#6E7A34"),
    "night": dict(pencil="#7D6F5A", blk_bg="#3A3126", blk_box="#5A4430", blk_line="#8A6A48", tree_bg="#2F3124",
                  tree_crown="#4E6A3E", tree_line="#7E9A62", trunk="#8A7556", vine_bg="#3A3A22", vine_line="#8C9A4A"),
}
PATTERNS = ["blk-sketch", "blk-ink", "tree-sketch", "tree-ink", "vine-sketch", "vine-ink", "hatch-ink"]


def canvas(w, h, bg=None):
    im = Image.new("RGBA", (w * S * SS, h * S * SS), bg or (0, 0, 0, 0))
    return im, ImageDraw.Draw(im), S * SS


def done(im, w, h):
    return im.resize((w * S, h * S), Image.LANCZOS)


def blk(c, ink):
    w, h = 9, 8
    im, d, k = canvas(w, h, c["blk_bg"] if ink else None)
    box = (1 * k, 1 * k, 7 * k, 6 * k)
    if ink:
        d.rectangle(box, fill=c["blk_box"], outline=c["blk_line"], width=max(1, int(0.5 * k)))
    else:
        d.rectangle(box, outline=c["pencil"], width=max(1, int(0.5 * k)))
    return done(im, w, h)


def tree(c, ink):
    w, h = 8, 8
    im, d, k = canvas(w, h, c["tree_bg"] if ink else None)
    line = c["tree_line"] if ink else c["pencil"]
    r = (2.5 if ink else 2.2) * k
    cx, cy = 4 * k, 3.5 * k
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c["tree_crown"] if ink else None, outline=line, width=max(1, int(0.55 * k)))
    d.line([(4 * k, (6 if ink else 5.7) * k), (4 * k, (7.6 if ink else 7.4) * k)], fill=c["trunk"] if ink else c["pencil"], width=max(1, int(0.65 * k)))
    return done(im, w, h)


def vine(c, ink):
    w, h = 6, 4
    im, d, k = canvas(w, h, c["vine_bg"] if ink else None)
    line = c["vine_line"] if ink else c["pencil"]
    x = 0.0
    while x < w:  # čárkovaná čára 1,2 / 1,2 jako v předloze
        d.line([(x * k, 2 * k), (min(x + 1.2, w) * k, 2 * k)], fill=line, width=max(1, int(0.9 * k)))
        x += 2.4
    return done(im, w, h)


def hatch(c, ink):
    w, h = 6, 6
    im, d, k = canvas(w, h)
    line = c["vine_line"]
    for off in (-6, 0, 6):  # úhlopříčka s přesahy kvůli bezešvému navázání
        d.line([(0 * k + off * k, 6 * k), (6 * k + off * k, 0)], fill=line, width=max(1, int(0.6 * k)))
    return done(im, w, h)


def main():
    os.makedirs(OUT, exist_ok=True)
    entries = []
    for mode, c in COLORS.items():
        makers = {
            "blk-sketch": blk(c, False), "blk-ink": blk(c, True), "tree-sketch": tree(c, False), "tree-ink": tree(c, True),
            "vine-sketch": vine(c, False), "vine-ink": vine(c, True), "hatch-ink": hatch(c, True),
        }
        for name in PATTERNS:
            key = f"{mode}-{name}"
            makers[name].save(os.path.join(OUT, f"{key}@3x.png"), optimize=True)
            entries.append((key, f"../../assets/map/patterns/{key}.png"))
    lines = [
        "// Generováno skriptem tools/maps/make-patterns.py, neupravovat ručně. Statické require kvůli Metro.",
        "export const PATTERNS: Record<string, number> = {",
    ]
    lines += [f'  "{n}": require("{p}"),' for n, p in entries]
    lines += ["};", ""]
    open(INDEX, "w").write("\n".join(lines))
    print(f"{len(entries)} vzorů")


main()
