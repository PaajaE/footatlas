# Import vlastní trasy z GPX

Stav: návrh, nic z toho zatím není implementováno. Formáty exportů jednotlivých aplikací je nutné ověřit na reálných souborech.

## Proč

Uživatel si chce virtuálně projít trasu, kterou zná nebo o které sní: z AllTrails, Komootu, Mapy.com, Stravy, Garminu. Přímé napojení na tyto služby legálně nejde (AllTrails nemá veřejné API a podmínky zakazují scraping, Komoot a Outdooractive mají API jen pro partnery). Všechny ale umožňují **export GPX**, a soubor, který si uživatel sám stáhne a otevře ve FootAtlasu, jsou jeho data pro jeho osobní použití.

Zároveň to řeší úzké hrdlo obsahu (spec 7.6): uživatel má výpravu i bez kurátorovaného balíčku.

## Co import je a co není

- **Je** to nová **výprava** (spec 5.3) po geometrii z GPX. Začíná od nuly, počítá se do ní jen pohyb po zahájení, platí pro ni stejná pravidla jako pro ostatní výpravy.
- **Není** to zdroj pohybových dat. Časy a body ze záznamu túry se **nepřičítají do kroniky** ani do životní cesty; jediným zdrojem pravdy zůstávají zdravotní data (spec 6.1). V UI to musí být jasně řečeno („Trasa, ne záznam pohybu“).
- **Není** to sdílený obsah. Importovaná trasa zůstává na zařízení a není nabízena dalším uživatelům, nepřebírá se název, logo ani popis cizí služby. Aplikace soubory sama nestahuje z URL, zpracovává jen soubor, který jí uživatel předá.
- Štítek typu trasy (spec 5.4): **„Skutečná trasa · vlastní import“**.

## Postup pro uživatele

1. V AllTrails / Komootu / Mapy.com / Stravě / Garmin Connect exportovat trasu jako GPX. U některých služeb je export jen pro vlastní trasy nebo jen v placeném účtu, nápověda v aplikaci to má zmínit obecně, bez slibů.
2. Otevřít soubor ve FootAtlasu: tlačítko „Importovat GPX“ v záložce Objevovat, nebo „Otevřít v…“ / sdílet ze souborů.
3. Náhled: mapa, délka, převýšení (pokud je v souboru výška), navržené etapy. Uživatel může:
   - zvolit, kterou stopu použít, pokud jich soubor obsahuje víc,
   - otočit směr,
   - přejmenovat výpravu (výchozí název z `<name>`, jinak z názvu souboru).
4. „Vyrazit“ → výprava se spustí jako jakákoli jiná. Pokud už jiná výprava běží, nabídne se její pozastavení (v MVP jedna aktivní výprava).

## Zpracování souboru

Všechno probíhá na zařízení, nic se neodesílá na server.

1. **Načtení**: max. 20 MB. MIME typ se nespolehlivě hlásí (často `application/octet-stream`), proto picker přijímá cokoli a o platnosti rozhoduje obsah.
2. **Parsování** GPX 1.0 i 1.1:
   - `trk/trkseg/trkpt` (zaznamenané nebo plánované stopy), `rte/rtept` (plánované trasy), `wpt` (body zájmu).
   - Z bodu se bere jen `lat`, `lon` a volitelně `ele`. **Časy, `metadata/author`, e‑maily, odkazy a rozšíření (`extensions`) se zahazují** hned při načtení.
   - Neplatné souřadnice se vyřazují; soubor bez použitelné geometrie skončí srozumitelnou chybou.
3. **Sestavení linie**: segmenty jedné stopy se spojí v pořadí. Mezera mezi segmenty delší než ~200 m se v náhledu vyznačí (spojí se rovnou čarou).
4. **Vyčištění**: odstranění duplicitních bodů a zjednodušení (Douglas–Peucker, tolerance cca 5 m). U zaznamenaných stop GPS šum délku jinak znatelně nafukuje. Cílem je max. ~5 000 bodů kvůli úložišti a vykreslení.
5. **Délka**: součet vzdáleností po povrchu (haversine), **bez vlivu výšky**. Výška slouží jen k profilu a milníku „nejvyšší bod“.
6. **Limity**: délka 1–5 000 km. Kratší trasu nemá smysl „chodit“ virtuálně, delší je spíš životní cesta (spec 5.2).

## Co se z trasy vytvoří

Importovaná trasa nemá kurátorovaný obsah (zastávky podle šablony 7.3 vyžadují zdroje a fact-check), takže výprava staví na tom, co jde spočítat:

- **Etapy** rozdělené rovnoměrně po zhruba 20 km (spec 7.1: 15–25 km), konec etapy jako milník.
- **Milníky z geometrie**: první kilometr, polovina, cíl, nejvyšší bod (pokud je výška), kulaté vzdálenosti.
- **Vlastní body** z `wpt`: každý se promítne na nejbližší místo linie (→ vzdálenost od startu) a stane se jednoduchým bodem s názvem. Body dál než ~500 m od trasy se ignorují. Nejsou to „zastávky“ ani „objevy“ ve smyslu spec 7.2, v UI se odliší.
- **Po MVP**: automatické objevy podél trasy z Wikidat a Wikipedie (CC0 / CC BY‑SA, s atribucí), pokud se ukáže, že kurátorované výpravy a importy vedle sebe dávají smysl. Dotaz by šel přes Cloudflare Worker, bez odeslání celé trasy, jen bodů po pár km.

Pohlednice z dokončené importované výpravy (spec 10) je v pořádku: ukazuje vlastní geometrii uživatele a štítek „vlastní import“, ne značku cizí služby.

## Návrh implementace

- **packages/core/src/route.ts**, čistý TS bez závislostí:
  - `RoutePoint { lat, lon, ele? }`, `haversineM(a, b)`, `cumulativeM(points)`,
  - `simplify(points, toleranceM)`,
  - `positionAt(points, cumulative, m)`: interpolovaná poloha na linii (pro značku na mapě),
  - `projectOnto(points, cumulative, lat, lon)`: vzdálenost od startu a odchylka od linie (pro `wpt`),
  - `splitStages(totalM, targetM = 20_000)`.
  - Waypointy a milníky se pak předají do stávající funkce `progress()` z `expedition.ts`.
- **packages/content/src/gpx.ts**: `parseGpx(xml): ParsedGpx | GpxError` (stopy, trasy, body) a zod schéma `importedRoute` pro uloženou podobu:
  `{ id, name, source: { kind: "gpx", fileName, creator?, importedAt }, points, totalM, reversed }`.
  `creator` (atribut GPX, např. „AllTrails“) se uloží jen kvůli ladění a nezobrazuje se jako značka.
  XML parser: React Native nemá `DOMParser`, kandidát je čistě JS knihovna (např. `fast-xml-parser`). Ověřit kompatibilitu s Hermes a velikost.
- **apps/mobile**:
  - výběr souboru `expo-document-picker` + čtení `expo-file-system` (ověřit v dokumentaci SDK 58),
  - otevření `.gpx` z jiné aplikace: Android `intentFilters` v `app.json`, iOS `CFBundleDocumentTypes` (config plugin). Až po prvním funkčním importu přes picker,
  - obrazovka náhledu (mapa MapLibre, délka, profil, etapy) a uložení lokálně spolu s ostatními výpravami.
- **Testy**: malé syntetické fixtury napodobující exporty z AllTrails, Komootu, Mapy.com, Stravy a Garminu (GPX 1.0 i 1.1, více segmentů, jen `rte`, jen `wpt`, chybějící výška, rozbité XML). Geometrie: známá vzdálenost mezi dvěma body, `positionAt` na koncích a uprostřed, zjednodušení nemění délku o víc než ~1 %.

## Otevřené body

- **Placené, nebo zdarma?** Princip 7 (spec 4) říká „zdarma je plný zážitek, platí se za další obsah“ a vlastní data nikdy nejsou placená (spec 11). Import je vlastní obsah uživatele, proto návrh: zdarma. Rizikem je, že sníží motivaci kupovat balíčky výprav.
- Mapový podklad pro trasy mimo dobré pokrytí Mapy.com (viz `technologie.md`, varianta PMTiles z OSM).
- Zda později podporovat i KML, GeoJSON nebo FIT. GPX zatím pokrývá všechny jmenované služby.
- Zda mezery mezi segmenty spojovat rovnou čarou, nebo dovolit uživateli zvolit jen jeden segment.
- Reálné exporty: ověřit na skutečných souborech z každé služby, co přesně obsahují (např. jestli Komoot exportuje `trk`, nebo `rte`).
