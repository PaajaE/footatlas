#!/usr/bin/env python3
"""Vyrobí pečeti a razítka míst pro mapu podle docs/prototyp-snimky/02-peceti.jpg (balík B).

Stavy míst na mapě:
  zastávka dosažená   `<téma>-reached-<id>`  vosková pečeť (rumělka, nepravidelný okraj) s fotkou a dvojitým kroužkem;
                      zastávka bez fotky má v pečeti věž
  zastávka další      `<téma>-next-<id>`     šedý (sepiový) medailon s fotkou v čárkovaném tužkovém kroužku;
                      štítek s metry kreslí MapLibre jako text (mění se), ne obrázek
  zastávka zamčená    `<téma>-locked`        tužkový šrafovaný kroužek s otazníkem (jeden obrázek pro všechny)
  malý objev dosažený `<téma>-stamp-reached` inkoustové razítko (dvojitý rumělkový kroužek, „otřepaný“ okraj)
  malý objev zamčený  `<téma>-stamp-locked`  tečkovaný tužkový kroužek s otazníkem
Dále štítek `<téma>-pill` (tmavá pilulka pod medailonem, MapLibre ji roztáhne pod text s metry) a kresby `<téma>-drawing-
boat|castle|bridge` (loď u přívozu, zámek, most; vkládají se jen k místům, jejichž název to říká).
Vstup: fotky z docs/mockupy/assets (foto-<id>.jpg; zdroje a licence v ZDROJE.md), písmo IM Fell z node_modules.
Výstup: apps/mobile/assets/map/medallions/<klíč>@3x.png (starší soubory se smažou) a src/map/medallionFiles.ts.
Velikost na mapě řídí `icon-size` ve vrstvě (přehled / trasa / detail), obrázky jsou jen jedna velikost @3x.
Spuštění: python3 tools/maps/make-medallions.py (potřebuje Pillow).
"""
import json
import math
import os
import random

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PHOTOS = os.path.join(ROOT, "docs", "mockupy", "assets")
OUT = os.path.join(ROOT, "apps", "mobile", "assets", "map", "medallions")
INDEX = os.path.join(ROOT, "apps", "mobile", "src", "map", "medallionFiles.ts")
FONT = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "im-fell-english", "400Regular_Italic", "IMFellEnglish_400Regular_Italic.ttf")
S = 3  # @3x
CANVAS = 56  # dp; pečeť má nepravidelný okraj, proto rezerva
SS = 4  # nadvzorkování pro hladké okraje
THEMES = {
    "day": {"surface": "#F8F1E1", "ink": "#2B2118", "accent": "#9B2C22", "pencil": "#75644E", "wax2": "#7E2119", "paper": "#EFE4CB"},
    "night": {"surface": "#372E24", "ink": "#F1E6D2", "accent": "#E0704A", "pencil": "#B5A68D", "wax2": "#B2502F", "paper": "#2B241C"},
}
# Ikona věže (souřadnice vůči středu, dp), pro zastávky bez fotky.
TOWER = [(-4, 4), (-4, -2), (-2, -5), (0, -2), (0, -5), (4, -5), (4, 4)]
# Zastávky s fotkou: id místa -> soubor fotky.
PHOTO_FILES = {
    "vysehrad": "vysehrad", "troja": "troja", "roztoky": "roztoky", "levy-hradec": "levy-hradec",
    "libcice": "libcice", "nelahozeves": "nelahozeves", "veltrusy": "veltrusy", "melnik": "melnik",
}


def circle_photo(path, size, gray=False):
    im = Image.open(path).convert("RGB")
    im = ImageOps.fit(im, (size, size), method=Image.LANCZOS, centering=(0.5, 0.5))
    if gray:  # šedá s lehkým sépiovým nádechem, jako „další na řadě“ v prototypu
        im = ImageOps.colorize(ImageOps.grayscale(im), black="#2B2118", white="#E9E1D0", mid="#8C8374")
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def canvas():
    k = S * SS
    img = Image.new("RGBA", (CANVAS * k, CANVAS * k), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img), k, CANVAS * k / 2


def finish(img):
    return img.resize((CANVAS * S, CANVAS * S), Image.LANCZOS)


def blob(cx, cy, r, rng, wobble=0.045, lobes=9):
    """Nepravidelný okraj vosku: kruh s několika vlnami a drobným šumem (deterministický podle `rng`)."""
    ph = [rng.uniform(0, 2 * math.pi) for _ in range(3)]
    pts = []
    for i in range(240):
        t = i / 240 * 2 * math.pi
        n = math.sin(lobes * t + ph[0]) * 0.5 + math.sin((lobes + 4) * t + ph[1]) * 0.3 + math.sin(3 * t + ph[2]) * 0.4
        n += rng.uniform(-0.12, 0.12)
        rr = r * (1 + wobble * n)
        pts.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    return pts


def ring(d, cx, cy, r, color, width):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=color, width=max(1, int(width)))


def dashed_ring(d, cx, cy, r, color, width, dash_deg=9, gap_deg=7):
    a = 0
    while a < 360:
        d.arc((cx - r, cy - r, cx + r, cy + r), a, a + dash_deg, fill=color, width=max(1, int(width)))
        a += dash_deg + gap_deg


def question(d, cx, cy, size, color, k):
    f = ImageFont.truetype(FONT, int(size * k))
    d.text((cx, cy), "?", font=f, fill=color, anchor="mm")


def wax_seal(c, photo, seed):
    img, d, k, cx = canvas()
    cy = cx
    rng = random.Random(seed)
    # vosk: tmavší okraj, nad ním o něco světlejší tělo, nepravidelné
    d.polygon(blob(cx, cy, 22.6 * k, rng), fill=c["wax2"])
    d.polygon(blob(cx, cy, 21.4 * k, random.Random(seed + 1), 0.035), fill=c["accent"])
    # vnitřní dvojitý kruh: smetanový proužek a tenká rumělková linka (inset 3 px #F8F1E1, 4,2 px rumělka)
    ring(d, cx, cy, 17.6 * k, c["surface"], 1.5 * k)
    ring(d, cx, cy, 16.2 * k, c["accent"], 0.5 * k)
    r_in = 15.4 * k
    if photo:
        size = int(2 * r_in)
        ph = circle_photo(photo, size)
        img.paste(ph, (int(cx - size / 2), int(cy - size / 2)), ph)
    else:
        d.ellipse((cx - r_in, cy - r_in, cx + r_in, cy + r_in), fill=c["surface"])
        d.polygon([(cx + x * 1.5 * k, cy + y * 1.5 * k) for x, y in TOWER], fill=c["accent"])
    return finish(img)


def next_medallion(c, photo):
    img, d, k, cx = canvas()
    cy = cx
    r = 20 * k
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c["surface"], outline=c["paper"], width=int(1 * k))
    if photo:
        size = int(2 * 16.5 * k)
        ph = circle_photo(photo, size, gray=True)
        img.paste(ph, (int(cx - size / 2), int(cy - size / 2)), ph)
    else:
        rr = 16.5 * k
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=c["paper"])
        d.polygon([(cx + x * 1.5 * k, cy + y * 1.5 * k) for x, y in TOWER], fill=c["pencil"])
    dashed_ring(d, cx, cy, 18.4 * k, c["pencil"], 1.5 * k)
    return finish(img)


def locked_ring(c):
    img, d, k, cx = canvas()
    cy = cx
    r = 18 * k
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c["surface"])
    # šrafy pod 45°, oříznuté kruhem (maska)
    hatch = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hatch)
    step = 3.2 * k
    t = -CANVAS * k
    while t < CANVAS * k * 2:
        hd.line([(t, CANVAS * k), (t + CANVAS * k, 0)], fill=c["pencil"] + "88", width=max(1, int(0.55 * k)))
        t += step
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse((cx - r + 1.4 * k, cy - r + 1.4 * k, cx + r - 1.4 * k, cy + r - 1.4 * k), fill=255)
    img.paste(hatch, (0, 0), Image.composite(hatch.getchannel("A"), Image.new("L", img.size, 0), mask))
    ring(d, cx, cy, r, c["pencil"], 1.6 * k)
    d.ellipse((cx - 6.5 * k, cy - 6.5 * k, cx + 6.5 * k, cy + 6.5 * k), fill=c["surface"])
    question(d, cx, cy + 0.5 * k, 13, c["pencil"], k)
    return finish(img)


def stamp_reached(c, seed):
    img, d, k, cx = canvas()
    cy = cx
    rng = random.Random(seed)
    ring(d, cx, cy, 14 * k, c["accent"], 2.2 * k)
    ring(d, cx, cy, 10.2 * k, c["accent"], 1.3 * k)
    d.ellipse((cx - 2.6 * k, cy - 2.6 * k, cx + 2.6 * k, cy + 2.6 * k), fill=c["accent"])
    # „otřepaný“ okraj razítka: náhodné drobné výseky (průhlednost) podél obou kroužků
    px = img.load()
    for _ in range(420):
        a = rng.uniform(0, 2 * math.pi)
        rad = rng.choice([14 * k, 10.2 * k, 14 * k]) + rng.uniform(-1.2 * k, 1.2 * k)
        x, y = int(cx + rad * math.cos(a)), int(cy + rad * math.sin(a))
        rr = int(rng.uniform(0.25, 0.7) * k)
        for yy in range(y - rr, y + rr + 1):
            for xx in range(x - rr, x + rr + 1):
                if (xx - x) ** 2 + (yy - y) ** 2 <= rr * rr and 0 <= xx < img.width and 0 <= yy < img.height:
                    px[xx, yy] = (0, 0, 0, 0)
    return finish(img)


def stamp_locked(c):
    img, d, k, cx = canvas()
    cy = cx
    r = 12.5 * k
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c["surface"] + "CC")
    dashed_ring(d, cx, cy, r, c["pencil"], 1.3 * k, dash_deg=4, gap_deg=6)
    question(d, cx, cy + 0.4 * k, 12, c["pencil"], k)
    return finish(img)


def pill(c):
    k = S * SS
    w, h = 28, 16
    img = Image.new("RGBA", (w * k, h * k), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, w * k - 1, h * k - 1), radius=h * k // 2, fill=c["ink"])
    return img.resize((w * S, h * S), Image.LANCZOS)


def drawing(c, kind):
    """Drobná tuš­ová kresba (zjednodušená, ne podle konkrétní stavby): obrys inkoustem, výplň papírem."""
    img, d, k, cx = canvas()
    cy = cx
    ink, fill, w = c["ink"], c["surface"], max(1, int(0.9 * k))

    def P(pts):
        return [(cx + x * k, cy + y * k) for x, y in pts]

    if kind == "castle":
        body = [(-13, 8), (-13, -2), (-10, -2), (-10, -5), (-7, -5), (-7, -2), (-4, -2), (-4, -9), (-2, -12), (0, -9), (0, -2),
                (4, -2), (4, -5), (7, -5), (7, -2), (10, -2), (10, -5), (13, -5), (13, 8)]
        d.polygon(P(body), fill=fill, outline=ink, width=w)
        d.line(P([(-13, 8), (13, 8)]), fill=ink, width=w)
        for x in (-8, 0, 8):
            d.rectangle((cx + (x - 1) * k, cy + 1 * k, cx + (x + 1) * k, cy + 5 * k), outline=ink, width=max(1, int(0.6 * k)))
    elif kind == "bridge":
        d.line(P([(-14, -1), (14, -1)]), fill=ink, width=int(1.6 * k))
        for x0 in (-9, 0, 9):
            d.arc((cx + (x0 - 4.5) * k, cy - 1 * k, cx + (x0 + 4.5) * k, cy + 9 * k), 180, 360, fill=ink, width=w)
        for x0 in (-13.5, -4.5, 4.5, 13.5):
            d.line(P([(x0, -1), (x0, 6)]), fill=ink, width=w)
    elif kind == "boat":
        d.polygon(P([(-9, 3), (9, 3), (6, 8), (-6, 8)]), fill=fill, outline=ink, width=w)
        d.line(P([(0, 3), (0, -10)]), fill=ink, width=w)
        d.polygon(P([(1, -10), (1, 1), (8, 1)]), fill=fill, outline=ink, width=w)
        d.polygon(P([(-1, -7), (-1, 1), (-6, 1)]), fill=fill, outline=ink, width=w)
    return finish(img)


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):  # starší varianty (např. šedé zamčené medailony s fotkou) se nahrazují
        if f.endswith(".png"):
            os.remove(os.path.join(OUT, f))
    data = json.load(open(os.path.join(ROOT, "packages", "content", "data", "vltavska-stezka", "expedition.json")))
    stops = [p["id"] for p in data["places"] if p["kind"] == "stop"]
    entries = []

    def save(img, name):
        img.save(os.path.join(OUT, f"{name}@3x.png"), optimize=True)
        # Metro sám najde variantu @3x, proto se v require přípona škálování neuvádí.
        entries.append((name, f"../../assets/map/medallions/{name}.png"))

    for theme, c in THEMES.items():
        for n, pid in enumerate(stops):
            photo = None
            if pid in PHOTO_FILES:
                photo = os.path.join(PHOTOS, f"foto-{PHOTO_FILES[pid]}.jpg")
                if not os.path.exists(photo):
                    raise SystemExit(f"Chybí {photo}")
            save(wax_seal(c, photo, 100 + n), f"{theme}-reached-{pid}")
            save(next_medallion(c, photo), f"{theme}-next-{pid}")
        save(locked_ring(c), f"{theme}-locked")
        save(stamp_reached(c, 7), f"{theme}-stamp-reached")
        save(stamp_locked(c), f"{theme}-stamp-locked")
        save(pill(c), f"{theme}-pill")
        for kind in ("boat", "castle", "bridge"):
            save(drawing(c, kind), f"{theme}-drawing-{kind}")
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
