#!/usr/bin/env python3
"""Vyrobí písma pro mapu (glyfy ve formátu PBF) z písma IM Fell English a přepíše src/map/glyphFiles.ts.

Proč: popisky atlasu jsou kurzívou IM Fell (balík B, docs/design-prototyp.md §4), ale přibalené glyfy byly jen
Noto Sans. MapLibre čte písmo jako SDF bitmapy po rozsazích po 256 znacích (`<písmo>/<od>-<do>.pbf`).

Postup shodný s TinySDF z MapLibre (velikost 24 px, okraj 3 px, dosah 8 px, odříznutí 0,25) a s rozložením
fontniku (kalibrováno na přibalených Noto Sans: `top` = výška nad základní linkou − 26, bitmapa je (š+6)×(v+6)).
SDF se počítá z masky vykreslené ve čtyřnásobném rozlišení přesnou euklidovskou vzdáleností (numpy).

Spuštění (potřebuje Pillow a numpy; písmo z `pnpm install`):
    python3 tools/maps/make-glyphs.py
Výstup: apps/mobile/assets/map/glyphs/IM Fell English Italic/<rozsah>.pbf, apps/mobile/src/map/glyphFiles.ts.
Písmo IM Fell English je pod licencí SIL OFL (stejně jako Noto Sans), viz src/data/credits.ts.
"""
import os
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FONTS = {
    "IM Fell English Italic": os.path.join(
        ROOT, "node_modules", "@expo-google-fonts", "im-fell-english", "400Regular_Italic", "IMFellEnglish_400Regular_Italic.ttf"
    ),
}
GLYPHS = os.path.join(ROOT, "apps", "mobile", "assets", "map", "glyphs")
INDEX = os.path.join(ROOT, "apps", "mobile", "src", "map", "glyphFiles.ts")
RANGES = [(0, 255), (256, 511), (8192, 8447), (8448, 8703)]
SIZE, BUF, RADIUS, CUTOFF, SS, ASC = 24, 3, 8.0, 0.25, 4, 26


def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        out.append(b | (0x80 if n else 0))
        if not n:
            return bytes(out)


def zigzag(n):
    return (n << 1) ^ (n >> 63)


def fld(num, wire, payload):
    return varint(num << 3 | wire) + payload


def vfield(num, n):
    return fld(num, 0, varint(n))


def bfield(num, data):
    return fld(num, 2, varint(len(data)) + data)


def edt(mask):
    """Přesná euklidovská vzdálenost každého pole k nejbližšímu poli `mask` (True); dvouprůchodově."""
    h, w = mask.shape
    big = 1e9
    g = np.where(mask, 0.0, big)
    ys = np.arange(h)
    # svisle: g[y,x] = min_y' (y-y')^2, kde mask[y',x]
    d = (ys[:, None] - ys[None, :]) ** 2  # h×h
    col = np.where(mask.T[:, None, :], d[None, :, :], big)  # w×h×h
    g = col.min(axis=2).T
    xs = np.arange(w)
    dx = (xs[:, None] - xs[None, :]) ** 2  # w×w
    out = (g[:, :, None] + dx[None, :, :]).min(axis=1)  # h×w
    return np.sqrt(out)


def has_glyph(font, ch, notdef):
    m = font.getmask(ch, mode="L")
    return m.size != notdef[0] or bytes(m) != notdef[1] or ch == " "


def glyph(font, cp, notdef):
    ch = chr(cp)
    adv = int(round(font.getlength(ch) / SS))
    if not has_glyph(font, ch, notdef):
        return None
    pad = 40 * SS
    W = H = 160 * SS
    im = Image.new("L", (W, H), 0)
    ox, oy = pad, 100 * SS  # počátek (základní linka) na plátně
    ImageDraw.Draw(im).text((ox, oy), ch, font=font, fill=255, anchor="ls")
    a = np.asarray(im) > 127
    if not a.any():
        return dict(id=cp, bitmap=b"", w=0, h=0, left=0, top=-ASC, adv=adv)
    ys, xs = np.where(a)
    x0, x1 = (xs.min() - ox) // SS, -(-(xs.max() + 1 - ox) // SS)
    y0, y1 = (ys.min() - oy) // SS, -(-(ys.max() + 1 - oy) // SS)
    w, h = int(x1 - x0), int(y1 - y0)
    # oblast včetně okraje, ve vysokém rozlišení
    bx0, by0 = ox + (x0 - BUF) * SS, oy + (y0 - BUF) * SS
    sub = a[by0 : by0 + (h + 2 * BUF) * SS, bx0 : bx0 + (w + 2 * BUF) * SS]
    d_out = edt(sub)  # u pole mimo tvar: vzdálenost k tvaru
    d_in = edt(~sub)  # u pole uvnitř: vzdálenost k pozadí
    sd = np.where(sub, -(d_in - 0.5), d_out - 0.5) / SS  # kladné vně, v pixelech 1×
    c = SS // 2
    sd = sd[c::SS, c::SS][: h + 2 * BUF, : w + 2 * BUF]
    val = np.clip(np.rint(255 - 255 * (sd / RADIUS + CUTOFF)), 0, 255).astype(np.uint8)
    return dict(id=cp, bitmap=val.tobytes(), w=w, h=h, left=int(x0), top=int(-y0 - ASC), adv=adv)


def encode(name, rng, glyphs):
    body = bfield(1, name.encode()) + bfield(2, f"{rng[0]}-{rng[1]}".encode())
    for g in glyphs:
        gb = vfield(1, g["id"])
        if g["bitmap"]:
            gb += bfield(2, g["bitmap"])
        gb += vfield(3, g["w"]) + vfield(4, g["h"]) + vfield(5, zigzag(g["left"])) + vfield(6, zigzag(g["top"])) + vfield(7, g["adv"])
        body += bfield(3, gb)
    return bfield(1, body)


def main():
    for name, path in FONTS.items():
        font = ImageFont.truetype(path, SIZE * SS)
        nm = font.getmask(chr(0x10FFFE), mode="L")
        notdef = (nm.size, bytes(nm))
        d = os.path.join(GLYPHS, name)
        os.makedirs(d, exist_ok=True)
        for rng in RANGES:
            gl = [g for cp in range(rng[0], rng[1] + 1) if (g := glyph(font, cp, notdef))]
            open(os.path.join(d, f"{rng[0]}-{rng[1]}.pbf"), "wb").write(encode(name, rng, gl))
            print(f"{name} {rng[0]}-{rng[1]}: {len(gl)} znaků")
    lines = [
        "// Generováno z assets/map/glyphs (Noto Sans a IM Fell English, SIL OFL; tools/maps/make-glyphs.py). Statické require kvůli Metro.",
        "export const GLYPH_FILES: ReadonlyArray<{ font: string; range: string; module: number }> = [",
    ]
    for font in sorted(os.listdir(GLYPHS), key=lambda f: (f.startswith("IM"), f)):
        ranges = sorted((f[:-4] for f in os.listdir(os.path.join(GLYPHS, font)) if f.endswith(".pbf")), key=lambda r: int(r.split("-")[0]))
        for r in ranges:
            lines.append(f'  {{ font: "{font}", range: "{r}", module: require("../../assets/map/glyphs/{font}/{r}.pbf") }},')
    lines += ["];", ""]
    open(INDEX, "w").write("\n".join(lines))


main()
