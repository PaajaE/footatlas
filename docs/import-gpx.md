# Import vlastní trasy z GPX

Stav: návrh. Implementována je jen geometrie a motor postupu v `packages/core` (`route.ts`, `engine.ts`); parser GPX a obrazovky zatím ne. Formáty exportů jednotlivých aplikací je nutné ověřit na reálných souborech.

Revize 30. 10. 2026: upřesněna právní formulace, zjednodušení trasy, promítání bodů u smyček, ochrana soukromí při sdílení a bezpečnost vstupu (viz „Revize“ na konci).

## Proč

Uživatel si chce virtuálně projít trasu, kterou zná nebo o které sní: z AllTrails, Komootu, Mapy.com, Stravy, Garminu. Přímé napojení na tyto služby legálně nejde (AllTrails nemá veřejné API a podmínky zakazují scraping, Komoot a Outdooractive mají API jen pro partnery). Všechny ale umožňují **export GPX**, a soubor, který si uživatel sám stáhne a otevře ve FootAtlasu, se zpracuje jen na jeho zařízení pro jeho osobní použití. Trasy často vytvořili jiní uživatelé nebo služba sama a podmínky služeb obvykle povolují jen osobní použití, takže „jeho data“ neplatí bezvýhradně; proto import nic nesdílí dál (viz níže).

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
   - GPX je nedůvěryhodný vstup: parser odmítne `DOCTYPE` a definice entit (ochrana proti XML bombě), neprovádí žádné načítání externích zdrojů a drží se limitu velikosti i počtu bodů ještě před sestavením linie.
3. **Sestavení linie**: segmenty jedné stopy se spojí v pořadí. Mezera mezi segmenty delší než ~200 m se v náhledu vyznačí (spojí se rovnou čarou).
4. **Vyčištění**: odstranění duplicitních bodů a zjednodušení (Douglas–Peucker, výchozí tolerance 5 m). U zaznamenaných stop GPS šum délku jinak znatelně nafukuje. Cílem je max. ~5 000 bodů kvůli úložišti a vykreslení; u dlouhých tras se tolerance sama zvětší, aby se limit splnil (`simplifyToLimit`). Pevná tolerance by limit u tras v řádu tisíců km nesplnila.
5. **Délka**: součet vzdáleností po povrchu (haversine), **bez vlivu výšky**. Výška slouží jen k profilu a milníku „nejvyšší bod“.
6. **Limity**: délka 1–5 000 km. Kratší trasu nemá smysl „chodit“ virtuálně, delší je spíš životní cesta (spec 5.2).

## Co se z trasy vytvoří

Importovaná trasa nemá kurátorovaný obsah (zastávky podle šablony 7.3 vyžadují zdroje a fact-check), takže výprava staví na tom, co jde spočítat:

- **Etapy** rozdělené rovnoměrně po zhruba 20 km (spec 7.1: 15–25 km), konec etapy jako milník.
- **Milníky z geometrie**: první kilometr, polovina, cíl, nejvyšší bod (pokud je výška), kulaté vzdálenosti.
- **Vlastní body** z `wpt`: každý se promítne na nejbližší místo linie (→ vzdálenost od startu) a stane se jednoduchým bodem s názvem. U smyček a tras tam a zpět se nejbližší místo hledá v okně kolem poslední nalezené vzdálenosti (`projectOnto` s `fromM` / `toM`), jinak by se body z druhého průchodu zařadily na první. Body dál než ~500 m od trasy se ignorují. Nejsou to „zastávky“ ani „objevy“ ve smyslu spec 7.2, v UI se odliší.
- **Po MVP**: automatické objevy podél trasy z Wikidat a Wikipedie (CC0 / CC BY‑SA, s atribucí), pokud se ukáže, že kurátorované výpravy a importy vedle sebe dávají smysl. Dotaz by šel přes Cloudflare Worker, bez odeslání celé trasy, jen bodů po pár km.

Pohlednice z dokončené importované výpravy (spec 10) ukazuje geometrii trasy a štítek „vlastní import“, ne značku cizí služby. Dvě podmínky: (1) u cizí trasy je sdílení obrázku ve skutečnosti šíření a licence služby nebo autora (např. NC u Via Czechia) je třeba posoudit, než se to povolí; (2) u vlastních záznamů, které začínají nebo končí u domova, nabídnout „skrýt prvních a posledních 200 m“ a při sdílení na to upozornit.

## Návrh implementace

- **packages/core/src/route.ts** (hotovo, s testy), čistý TS bez závislostí:
  - `RoutePoint { lat, lon, ele? }`, `haversineM(a, b)`, `cumulativeM(points)`, `routeLengthM(points)`,
  - `simplify(points, toleranceM)` a `simplifyToLimit(points, maxPoints)`,
  - `positionAt(points, cumulative, m)`: interpolovaná poloha na linii (pro značku na mapě),
  - `projectOnto(points, cumulative, lat, lon, { fromM, toM })`: vzdálenost od startu a odchylka od linie (pro `wpt`),
  - `splitStages(totalM, targetM = 20_000)`.
  - Místa a etapy se předají do `buildPlan` a `computeState` z `engine.ts` (stejný motor jako u kurátorovaných výprav).
- **packages/core/src/gpx.ts** (parser je čistá logika, nemá patřit do obsahového balíčku): `parseGpx(xml): ParsedGpx | GpxError` (stopy, trasy, body); zod schéma `importedRoute` pro uloženou podobu patří do `packages/content`:
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

## Revize 30. 10. 2026

Doporučení z kontroly návrhu, které z původního textu neplynou:

- **Importovaná výprava je bez obsahu „plochá“.** Jen rovnoměrné etapy a geometrické milníky jsou přesně ten zážitek, který spec 2.2 kritizuje u konkurence, a odporují principu 5 (hustota událostí). Automatické objevy z Wikidat a Wikipedie proto doporučuju brát jako jádro importu, ne jako rozšíření po MVP. Nabízí se z nich udělat placené „Obohatit trasu o místa“, což zároveň řeší otázku zdarma / placené bez kanibalizace balíčků. Povinnost atribuce CC BY-SA se musí promítnout do UI i do sdílených obrázků.
- **Hustota se dá kontrolovat strojově:** `densityReport` z `engine.ts` ukáže mezery a etapy bez zastávky i u obohacené importované trasy.
