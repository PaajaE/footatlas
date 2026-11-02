#!/usr/bin/env python3
"""Vyrobí medailony zastávek pro mapu: kruhový ořez fotky, kroužek, odznak „došlo se“ a šedou verzi pro zamčené.

Vstup: fotky z docs/mockupy/assets (foto-<id>.jpg; zdroje a licence v ZDROJE.md).
Výstup: apps/mobile/assets/map/medallions/<téma>-<stav>-<id>@3x.png a src/map/medallionFiles.ts.
Stavy: reached (došlo se), next (další zastávka, tlustší kroužek), locked (šedá). Zastávka bez fotky dostane
kruh s ikonou věže. Spuštění: python3 tools/maps/make-medallions.py (potřebuje Pillow).
"""
import json
import os
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PHOTOS = os.path.join(ROOT, "docs", "mockupy", "assets")
OUT = os.path.join(ROOT, "apps", "mobile", "assets", "map", "medallions")
INDEX = os.path.join(ROOT, "apps", "mobile", "src", "map", "medallionFiles.ts")
S = 3  # @3x
CANVAS = 50  # dp; střed medailonu je ve středu plátna, odznak přečnívá vpravo dole
THEMES = {
    "day": {"surface": "#F8F1E1", "ink": "#2B2118", "accent": "#9B2C22", "badge_fg": "#F6E7C8"},
    "night": {"surface": "#372E24", "ink": "#F1E6D2", "accent": "#E0704A", "badge_fg": "#2B241C"},
}
# Ikona věže ze mockupu (souřadnice vůči středu kruhu o poloměru 13, jednotky dp).
TOWER = [(-4, 4), (-4, -2), (-2, -5), (0, -2), (0, -5), (4, -5), (4, 4)]
# Zastávky s fotkou: id místa -> soubor fotky.
PHOTO_FILES = {
    "vysehrad": "vysehrad", "troja": "troja", "roztoky": "roztoky", "levy-hradec": "levy-hradec",
    "libcice": "libcice", "nelahozeves": "nelahozeves", "veltrusy": "veltrusy", "melnik": "melnik",
}


def circle_photo(path, size):
    im = Image.open(path).convert("RGB")
    im = ImageOps.fit(im, (size, size), method=Image.LANCZOS, centering=(0.5, 0.5))
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def render(theme, state, photo):
    c = THEMES[theme]
    img = Image.new("RGBA", (CANVAS * S * 4, CANVAS * S * 4), (0, 0, 0, 0))  # 4x nadvzorkování pro hladké okraje
    d = ImageDraw.Draw(img)
    k = S * 4
    cx = cy = CANVAS * k / 2
    reached = state in ("reached",)
    ring = c["accent"] if state != "locked" else c["ink"]
    width = 2.6 if state == "next" else 1.8
    r = (19 if photo else 13) * k
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c["surface"], outline=ring, width=int(width * k))
    if photo:
        ph = circle_photo(photo, int(32 * k))
        if state == "locked":
            g = ImageOps.grayscale(ph.convert("RGB")).convert("RGBA")
            g.putalpha(ph.getchannel("A"))
            ph = g
        img.paste(ph, (int(cx - 16 * k), int(cy - 16 * k)), ph)
    else:
        pts = [(cx + x * k, cy + y * k) for x, y in TOWER]
        d.polygon(pts, fill=ring)
    if reached:
        bx = cx + (12 if photo else 9) * k
        by = cy + (12 if photo else 9) * k
        br = 5.5 * k
        d.ellipse((bx - br, by - br, bx + br, by + br), fill=c["accent"])
        d.line([(bx - 2.5 * k, by), (bx - 0.7 * k, by + 1.8 * k), (bx + 2.5 * k, by - 1.6 * k)], fill=c["badge_fg"], width=int(1.3 * k), joint="curve")
    return img.resize((CANVAS * S, CANVAS * S), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    data = json.load(open(os.path.join(ROOT, "packages", "content", "data", "vltavska-stezka", "expedition.json")))
    stops = [p["id"] for p in data["places"] if p["kind"] == "stop"]
    entries = []
    for pid in stops:
        photo = None
        if pid in PHOTO_FILES:
            photo = os.path.join(PHOTOS, f"foto-{PHOTO_FILES[pid]}.jpg")
            if not os.path.exists(photo):
                raise SystemExit(f"Chybí {photo}")
        for theme in THEMES:
            for state in ("reached", "next", "locked"):
                name = f"{theme}-{state}-{pid}"
                render(theme, state, photo).save(os.path.join(OUT, f"{name}@3x.png"), optimize=True)
                # Metro sám najde variantu @3x, proto se v require přípona škálování neuvádí.
                entries.append((name, f"../../assets/map/medallions/{name}.png"))
    lines = [
        "// Generováno skriptem tools/maps/make-medallions.py, neupravovat ručně. Statické require kvůli Metro.",
        "export const MEDALLIONS: Record<string, number> = {",
    ]
    lines += [f'  "{n}": require("{p}"),' for n, p in entries]
    lines += ["};", ""]
    open(INDEX, "w").write("\n".join(lines))
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"{len(entries)} obrázků, {total // 1024} KB")


main()
