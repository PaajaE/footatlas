# Mockupy

Klíčové obrazovky MVP (390×844): karta života, domů, výprava s mapou, zastávka, kronika, konec etapy, objevovat.

## Vizuální směr

„Velká výprava“: tmavé rozhraní, skutečné fotky míst a mapa ve stylu starého pergamenu.

- **Fotky** jsou hlavní obsah. Objevená místa mají voskovou pečeť, neobjevená jsou šedá.
- **Mapa** je skutečná mapa (data OpenStreetMap) jen přebarvená do pergamenu. Nad ní je ušlá cesta rumělkou, plánovaná čárkovaně, zastávky jako medailony s fotkou, malé objevy jako pečeti a růžice větrů.
- **Písmo:** IM Fell English (názvy, nadpisy), Work Sans (rozhraní a čísla).
- **Barvy:** noční modř `#0F1A1E`, jantar `#E7A44B`, zlatá linka `#E2B862`, rumělka `#9B2C22`, pergamen `#E7D4AB`, inkoust `#3A2A1C`.

## Ukázková výprava

Vltavská stezka z Vyšehradu k soutoku v Mělníku, 62 km po skutečném toku řeky, 4 etapy. Na trase je 9 zastávek a 29 malých objevů, tedy místo zhruba každých 1,7 km. To je hustší, než předpokládá specifikace (7.2). Hustota se ověří na pilotní výpravě.

Všechny obrazovky ukazují stejný okamžik: uživatel ušel 35,6 km, právě došel do Kralup a dokončil 2. etapu. Další zastávka je zámek Nelahozeves za 3,0 km.

## Soubory

- `*.dc.html` jsou obrazovky. Otevírají se v Claude Design plátně (artifact „FootAtlas mockupy“). Pomocný soubor `support.js`, na který se odkazují, dodává editor a do repa se neukládá. Bez něj se dají otevřít i přímo v prohlížeči.
- `canvas.json` je rozložení plátna.
- `assets/` obsahuje fotky (`foto-*.jpg`) a vykreslené mapy (`mapa-*.jpg`). Autoři a licence fotek jsou v `assets/ZDROJE.md`. Při nahrávání na plátno je potřeba nahrát i tuto složku.
- `nastroje/` slouží k přegenerování obrazovek:
  - `mista.json` obsahuje místa na trase, `stav.json` postup uživatele.
  - `node trasa.mjs trasa` spočítá z mapových dat tok Vltavy a kilometr každého místa.
  - `node trasa.mjs mapy` vykreslí mapy do `assets/`. Potřebuje Playwright s Chromiem a přístup na tiles.openfreemap.org a unpkg.com.
  - `python3 obrazovky.py` vygeneruje všech sedm `*.dc.html`. Ruční úpravy z plátna je potřeba přenést do skriptu, jinak je další běh přepíše.

## Co není ověřené

- Texty zastávek, fakta a čísla jsou jen ukázka. Před použitím se musí ověřit ze dvou zdrojů (spec 7.3).
- Polohy malých objevů jsou přibližné.
- U fotky Trojského zámku chybí v metadatech autor, je potřeba ho doplnit.
- Mapové podklady jsou pro mockupy z bezplatné služby OpenFreeMap. Pro aplikaci platí doporučení z `docs/technologie.md`.
