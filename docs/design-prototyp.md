# Cílový vzhled: prototyp „FootAtlas prototyp Inkoust“

Stav k 2. 11. 2026. Rozbor prototypu, který dodal majitel produktu (`FootAtlas prototyp Inkoust.html`, 11,7 MB, 24 rámů: 12 světlých, 12 nočních). **Závazný vzor pro vzhled, rozložení a pohyb.** Současná aplikace (`main` + rozhodnutí 0014–0018) je s ním shodná jen v barvách a písmech; rozložení, ilustrace a odměny jsou jiné.

Snímky všech rámů jsou v [`prototyp-snimky/`](prototyp-snimky/) (390×844 @2×, světlé i noční; v nočních rámech prototypu chybí načtené fotky, jde o vadu prototypu). Zdrojové rámy `*.dc.html` jsou v [`mockupy/`](mockupy/) (shodné texty a styly; k vykreslení potřebují `support.js` z Claude Design, který v repu není; proto snímky). Fotografie a licence: `mockupy/assets/`, `mockupy/assets/ZDROJE.md`. Podkladové mapy a nástroje: `mockupy/nastroje/`.

## 1. Hlavní zjištění: čím se aplikace liší

| Oblast | Prototyp | Dnešní aplikace |
|---|---|---|
| **Mapa** | Ručně kreslený atlas: tužkové šrafování městských bloků, stromové vzory, řeka v akvarelové modři, rumělková stopa, ručně psané kurzívní popisky čtvrtí, rámeček „List I · Praha“ s měřítkem, kresby památek (Hradčany, mosty, loď). Ušlý úsek vybarvený, zbytek skica | Standardní OSM podklad v pergamenové paletě, bez ilustrací, bez skici |
| **Odměny** | Vosková pečeť s fotkou (zastávka), inkoustové razítko s „otřepaným“ okrajem (malý objev), tužkový kroužek s otazníkem (zamčeno), pečeť kapitoly s obloukem postupu, pečeť etapy s římskou číslicí | Obyčejné kolečko medailonu na mapě, seznamy bez ikon |
| **Domů** | Hlavička s názvem výpravy, 3 dlaždice čísel, karta další zastávky s kruhovou fotkou a hádankou, „Kam dnes dojdu?“ s volbou délky a výpisem, posuvná řada „Nedávno objeveno“, kapitoly | Velký nadpis další zastávky, seznam míst, karta „Od posledně“ |
| **Návrat** | „Inkoust“: celoobrazovková mapa, čítač km, razítka dopadají za letu kamery, spodní panel „Cestou jste potkali“ | Šedá karta s větou |
| **Zastávka** | Fotka přes celou šířku se slévavým přechodem do pergamenu, pečeť v rohu, háček kurzívou, kontext, „Až tam jednou půjdete“, deník a kapitola v dlaždicích, tlačítka „Poslat jako pohlednici“ / „Další zastávka“ | Text bez fotky, bez pečeti |
| **Kronika** | Přepínač Deník / Cesta / Rok / Sbírky, časová osa s čárkovanou nití a pečeťmi, karty dnů s minimapou úseku a čipy míst, zeměkoule | Statistiky v kartách |
| **Objevovat** | Karty připravovaných výprav (náhled trasy, štítek typu, délka, „Chci ji“), banner životní cesty | Jedna věta |
| **Další obrazovky** | Pohlednice z etapy (otočná), Přívoz (scéna), Karta života (zeměkoule), Hádanka a příchod | Chybí |
| **Tmavý režim** | Noční pergamen se sytě oranžovým akcentem `#E0704A`, zlatými popisky | Tokeny jsou, ale obrazovky jim neodpovídají |

## 2. Designový systém

### Barvy (světlé / noční)
Papír `#EFE4CB` / `#2B241C` · karta `#F8F1E1` / `#372E24` · inkoust `#2B2118` / `#F1E6D2` · tlumený text `#75644E` / `#B5A68D` · linky `#D8C9A9` / `#4A3E31` · akcent rumělka `#9B2C22` / `#E0704A` · okr (popisky) `#7F5718` / `#D9B068` · voda `#8FB7B4` / `#3E5552`. Tmavá „inkoustová“ karta (karta života, banner, aktivní čip) `#2B2118`. Obsažené v `apps/mobile/src/theme/tokens.ts`.

### Písmo
- **IM Fell English** (název obrazovky, názvy míst, háčky kurzívou, velká čísla se staročíslicemi „9,1 km“), **IM Fell English SC** (malé kapitálky: popisky sekcí, „DALŠÍ ZASTÁVKA“, „CESTOU JSTE POTKALI“), **Work Sans** (text, tlačítka, čipy, čísla v tabulkách).
- Velikosti z prototypu: 40 (velké číslo), 38 (název obrazovky), 26 / 24 (názvy karet), 20 / 17 (háček, otázka), 15 / 14 (text), 13 / 12 (popisky, malá písmena SC), 11 (štítky).
- Staročíslice IM Fell (např. „ıı,2 km“) jsou záměr, ne chyba.

### Tvary a stíny
Poloměry: karta 18, tlačítko 14, pilulka 999, čip 14, malé štítky 3–6, kulaté pečeti 50 %. Karty mají 1 px linku `#D8C9A9` bez stínu; plovoucí prvky (pohlednice, spodní panel, tlačítko „Mapa“) mají jemný stín `0 1px 3px rgba(43,33,24,.45)`. Pečeť: vnitřní dvojitý kruh `inset 0 0 0 3px #F8F1E1, inset 0 0 0 4.2px #9B2C22`.

### Komponenty (k vytvoření v `apps/mobile/src/components/`)
1. **Záhlaví obrazovky**: datum (malé) + název (velký, IM Fell) + kulaté tlačítko nastavení, pod tím tenká dělicí linka.
2. **Pruh etap** (už je) + řádek „Etapa 1 ze 4 · Praha“ vlevo a „12,5 z 62 km“ rumělkově vpravo.
3. **Dlaždice čísla** (3 vedle sebe): popisek, velké číslo + „km“ v IM Fell, drobný podpis.
4. **Čip** (1 km, 2 km, 4 km, Konec etapy; segmenty Deník/Cesta/Rok/Sbírky): pilulka, vybraný je tmavý (`#2B2118`, světlý text), v noci krémový.
5. **Medailon**: kruhová fotka (šedá, sepiová) v čárkovaném tužkovém kroužku, štítek „40 m“ v tmavé pilulce. Zamčený: šrafovaný kruh s otazníkem. Dosažený: vosková pečeť.
6. **Pečeť / razítko** (viz `Pecete.dc.html`, snímek `02-peceti.jpg`): SVG s filtry `waxEdge` a `grunge` (nepravidelný okraj), kruhový text po obvodu (název, km, datum), varianty: zastávka, malý objev (razítko), kapitola (oblouk postupu), konec etapy (římská číslice), velikosti na mapě (přehled / trasa / detail).
7. **Karta s popiskem** (SC okrová hlavička + obsah), **tmavá karta** (zeměkoule, banner).
8. **Primární tlačítko**: plná rumělka, bílý text, výška ~48, poloměr 14; sekundární: obrys. Dvojice tlačítek vedle sebe u pohlednice a návratu.
9. **Spodní lišta**: 4 záložky, aktivní rumělka + tučně (už je).
10. **Spodní panel (sheet)** s úchytem nad mapou (Výprava, Návrat).
11. **Časová osa** (Kronika): čárkovaná svislá nit, kroužková pečeť u dne, karta dne.

### Pohyb (z `Pecete.dc.html` a prototypu)
Dopad razítka 600 ms s přestřelem a haptikou „light“ · kruh kolem 700 ms, rozplyne se · rozestup razítek min. 250 ms · let kamery po trase 4–9 s, přeskočitelný („Přeskočit“, „Přehrát znovu“) · výpis „Kam dnes dojdu?“ se při změně volby překreslí plynule (`swap` 350 ms) · přechody: karta atlasu se rozbalí do mapy, hádanka přijíždí zprava, záložky se posouvají podle směru · vše respektuje „Omezit pohyb“ · zvuk ve výchozím stavu vypnutý.

## 3. Obrazovky (snímek → co udělat)

| Snímek | Obrazovka | Podstatné |
|---|---|---|
| `08-domu` | Domů | Záhlaví + dělicí linka; pruh etap; **3 dlaždice** (Dnes, Za 7 dní, Pohlednice); **karta další zastávky** (kruhový medailon vlevo, název, „40 m · asi 55 kroků“ rumělkově, hádanka kurzívou, tlačítko „Tipnout si odpověď“); **Kam dnes dojdu?** (čipy 1/2/4 km + zbytek etapy, výpis míst s metry a krokovými odhady, kurzívní hláška); **Nedávno objeveno** (vodorovně posuvné karty s pečetí, odkaz „Kronika“); **Kapitoly** (název, postup „4 z 5“, pruh, věta). |
| `09-vyprava` | Výprava | Mapa přes celou obrazovku. Plovoucí karta nahoře (název, pruh etap, „List I · Praha · 10 razítek z 14“). Pečeti na trase, tlačítko „Moje poloha“. Spodní panel: „Další zastávka · 40 m“, název, hádanka, tři údaje (Na dalších 5 km · Přívoz · Pohlednice). |
| `01-navrat-inkoust` | Návrat „Inkoust“ | „Od pátku jste ušli“ + velké číslo „9,1 km“ a „Karlův most → Troja“; mapa v rámečku „List I · Praha“ s měřítkem; spodní panel „Cestou jste potkali · 6 nových míst“ (dvousloupcový seznam s pečetěmi), pod tím další zastávka a hádanka; tlačítka „Přehrát znovu“ / „Projít objevy“; vpravo nahoře „Přeskočit“. |
| `03-hadanka` | Hádanka a příchod | Rozmazaná fotka zamčeného místa, štítek „Zatím zamčeno“, název, pruh „Od Trojské lávky · ještě 40 m“, karta hádanky se třemi možnostmi, „Cestou k zámku“ (předchozí a další místo). Po příchodu: fotka se zaostří, dopadne pečeť, odpověď. |
| `06-zastavka` | Zastávka odemčená | Viz §1. Pečeť v rohu fotky. Dole dlaždice „Ve vašem deníku“ a „Počátky Čech“ (kapitola s pruhem). |
| `02-peceti` | Pečeti a razítka | Specifikace všech stavů a pohybu (zdroj pravdy pro komponentu pečeti). |
| `04-pohlednice` | Pohlednice z etapy | Tři čísla (km, dny, místa), pohlednice „Pozdrav z Prahy“ se pečetí etapy, klepnutím se otočí, karta další etapy, „Uložit do Kroniky“ / „Sdílet obrázek“. |
| `05-privoz` | Přívoz | Scéna: mapa s lodí přes řeku, „Převezli jste se na druhý břeh“, háček, dlaždice (Přívozy, Další břeh). |
| `07-karta-zivota` | Karta života | Tmavá karta se zeměkoulí a obloukem ušlé vzdálenosti, „14 200 km“, dvě věty srovnání, karta „Z čeho číslo je“ (ověřeno / odhad / ručně), „Vybrat první výpravu“. |
| `10-objevovat` | Objevovat | Karty připravovaných výprav (náhled trasy, štítek typu, délka, „Chci ji“), dole tmavý banner životní cesty. Prototyp ukazuje 3 výpravy (délky k ověření). |
| `11-kronika` | Kronika | Tmavá karta nahoře (zeměkoule), přepínač Deník / Cesta / Rok / Sbírky, deník jako časová osa s kartami dnů (název dne, číslo km, kurzívní postřeh, minimapa úseku „km 9,1 → 12,2“, kroky, čipy míst). |
| `12`–`23` | Noční varianty | Stejné rozložení, noční tokeny. |

## 4. Mapový styl (největší rozdíl)

Ilustrovaný atlas, ne obarvený OSM. Prvky (z `Vyprava.dc.html`, `Main.dc.html`, `Pecete.dc.html`):
- **Bloky zástavby** jako šrafované polygony se vzorem čtverečků (`pattern blkI` = ušlé, kolorované okrovou; `blkS` = skica, jen obrys); **stromy / lesy** vzorem kroužků (`treI` / `treS`), **vinice** (`vinI` / `vinS`); šrafy pro zeleň (`hatchC`).
- **Řeka** v akvarelové modři s nepravidelným okrajem (filtr `wc`/`vwc`), vlnky, název „Vltava“ šikmo kurzívou; ušlý břeh se vybarví.
- **Stopa** rumělková, ušlá plná, neušlá čárkovaná tužkou.
- **Popisky** čtvrtí a míst kurzívou IM Fell; kresby památek (Hradčany, Malá Strana, mosty, loď, přístaviště) jako vložené SVG ikony.
- **Rámeček** „List I · Praha“ s měřítkem a vinětou; **maska inkoustu** (`inkmask`, `vink`) odkrývá kolorovanou vrstvu jen kolem ušlé trasy; zbytek je skica (filtr `pencil`).
- **Pečeti** na místech podle stavu (viz §2).
- Noční verze přepíná paletu (`mockupy/nastroje/mapa.html` má palety `pergamen`, `den`, `noc`).

Realizace v aplikaci: dvě vrstvy v `packages/map-style` (skica a kolorovaná) + maska podle ušlé části trasy (buffer), ilustrované prvky jako obrázky/ikony MapLibre nebo vrstva `react-native-svg` nad mapou; pečeti jako image markery generované `tools/maps/make-medallions.py`. Data map zůstávají v R2 (rozhodnutí 0013).

## 5. Plán prací

Pořadí vychází ze závislostí; **A, B, C jdou paralelně v cloudu**, D až po B.

| Balík | Obsah | Hlavní soubory | Závislost |
|---|---|---|---|
| **A · Základ a Domů + zastávka** | Komponenty z §2 (záhlaví, dlaždice, čip, medailon, pečeť, karta s popiskem, tlačítka), noční tokeny, **Domů**, **detail zastávky** (fotka, pečeť, dlaždice), **Hádanka** podle snímků | `src/theme/tokens.ts`, `src/components/*`, `src/app/(tabs)/index.tsx`, `src/app/zastavka/[id].tsx` | — |
| **B · Mapa jako atlas** | Skica + inkoust, ilustrované prvky, rámeček, pečeti na trase, nová **Výprava** (plovoucí karta, spodní panel) | `packages/map-style`, `src/components/ExpeditionMap.tsx`, `src/app/(tabs)/vyprava.tsx`, `tools/maps/*` | — |
| **C · Kronika, Objevovat, Karta života** | Deník jako časová osa, přepínač, zeměkoule, Objevovat karty, Karta života | `src/app/(tabs)/kronika.tsx`, `objevovat.tsx`, nové obrazovky | používá jen tokeny, vlastní komponenty v novém souboru |
| **D · Návrat, příchod, pohlednice, přívoz** | M1 let kamery s razítky, M4, otočná pohlednice, scéna přívozu | nové obrazovky + mapa | po B |
| **E · Obsah (člověk)** | Ověření faktů, příběhy etap 2–4, licence fotek, fotky míst do aplikace | `packages/content`, `docs/obsah-vltavska-podklady.md` | mimo cloud |

Pravidla pro všechny balíky: češtinou, texty z prototypu beze změny významu; žádné poznámky „k ověření“ v UI; metry i kroky; světlý vzhled výchozí; nevymýšlet fakta; před nativním kódem číst `apps/mobile/AGENTS.md`; po každé změně `pnpm typecheck` a `pnpm test`; vzhled ověřit na emulátoru (release APK, `tools/release-apk.sh`, ukázkový postup přes `footatlas:///dev`) a porovnat se snímkem z `docs/prototyp-snimky/`.

## 6. Rizika a nejasnosti

- Prototyp ukazuje „3 výpravy“ v Objevovat (Po Labi do Děčína, Krkonošská hřebenovka, Pěšky na Měsíc) a „Karta života“ s 14 200 km; jde o ukázková data. Délky a obsah před vydáním ověřit.
- Mapa v prototypu je ilustrace Prahy (List I); trasa a ilustrace pro etapy 2–4 je potřeba dokreslit (nástroje v `mockupy/nastroje/`).
- Fotografie z prototypu mají licence v `mockupy/assets/ZDROJE.md`; u Trojského zámku chybí autor.
- Animace (let kamery, dopad razítka, otočení pohlednice, přívoz) jsou vidět jen v živém prototypu; statické snímky ukazují konečný stav.
