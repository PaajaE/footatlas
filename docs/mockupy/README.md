# Mockupy

Klíčové obrazovky MVP (390×844): karta života, domů, výprava s mapou, zastávka, kronika, konec etapy, objevovat.

## Vizuální směr

Světlý pergamen jako výchozí režim, noční pergamen jako tmavý režim podle nastavení telefonu.

- **Fotky** jsou hlavní obsah. Nahoře obrazovky se rozpíjejí do papíru (ve tmě do tmy). Objevená místa mají voskovou pečeť, neobjevená jsou šedá.
- **Mapa** je skutečná mapa (data OpenStreetMap) přebarvená do denního nebo nočního pergamenu. Nad ní je ušlá cesta rumělkou, plánovaná čárkovaně, zastávky jako medailony s fotkou, malé objevy jako pečeti a růžice větrů. Menší mapy nemají rám a rozpouštějí se do stránky.
- **Písmo:** IM Fell English jen na nadpisy a názvy míst, Work Sans na text a čísla.
- **Barvy, den:** papír `#EFE4CB`, karty `#F8F1E1`, inkoust `#2B2118`, rumělka `#9B2C22` (tlačítka, trasa), okr `#8E6320` (popisky, linky).
- **Barvy, noc:** podklad `#2B241C`, karty `#372E24`, text `#F1E6D2`, rumělka `#C2522F`, okr `#D9B068`.
- **Karta života a pohlednice** mají obě verze. Obrázek, který se z nich sdílí, je ale vždy světlý.

## Ukázková výprava

Vltavská stezka z Vyšehradu k soutoku v Mělníku, 62 km po skutečném toku řeky, 4 etapy. Na trase je 10 zastávek a 28 malých objevů, tedy místo zhruba každých 1,7 km. Mezi Levým Hradcem a Kralupy přibyla zastávka Libčice nad Vltavou, takže zastávky jsou od sebe nejvýš 11,6 km (Vraňany–Mělník). Odpovídá hustotě ze specifikace v0.4 (7.2), která se ověří na pilotní výpravě.

Všechny obrazovky ukazují stejný okamžik: uživatel ušel 35,6 km, právě došel do Kralup a dokončil 2. etapu. Další zastávka je zámek Nelahozeves za 3,0 km.

## Soubory

- `*.dc.html` jsou obrazovky ve světlém režimu, `*-noc.dc.html` jejich tmavé verze všech sedmi (na plátně ve druhé řadě). Otevírají se v Claude Design plátně (artifact „FootAtlas mockupy“). Pomocný soubor `support.js`, na který se odkazují, dodává editor a do repa se neukládá. Bez něj se dají otevřít i přímo v prohlížeči.
- `canvas.json` je rozložení plátna.
- `assets/` obsahuje fotky (`foto-*.jpg`) a vykreslené mapy (`mapa-*.jpg`). Autoři a licence fotek jsou v `assets/ZDROJE.md`. Při nahrávání na plátno je potřeba nahrát i tuto složku.
- `nastroje/` slouží k přegenerování obrazovek:
  - `mista.json` obsahuje místa na trase, `stav.json` postup uživatele.
  - `node trasa.mjs trasa` spočítá z mapových dat tok Vltavy a kilometr každého místa.
  - `node trasa.mjs mapy` vykreslí mapy do `assets/` v denní a noční verzi (`mapa-*-noc.jpg`). Potřebuje Playwright s Chromiem a přístup na tiles.openfreemap.org a unpkg.com.
  - `python3 obrazovky.py` vygeneruje všechny `*.dc.html` v obou režimech. Ruční úpravy z plátna je potřeba přenést do skriptu, jinak je další běh přepíše.

## Co není ověřené

- Texty zastávek, fakta a čísla jsou jen ukázka. Před použitím se musí ověřit ze dvou zdrojů (spec 7.3).
- Polohy malých objevů jsou přibližné.
- U fotky Trojského zámku chybí v metadatech autor, je potřeba ho doplnit.
- Mapové podklady jsou pro mockupy z bezplatné služby OpenFreeMap. Pro aplikaci platí doporučení z `docs/technologie.md`.
