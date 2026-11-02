# Mockupy

Interaktivní prototyp obrazovek ve stylu **„Atlas, který kreslíte nohama“** (návrh: [`docs/navrh-prozitek.md`](../navrh-prozitek.md)). Telefon 390×844, světlý pergamen jako výchozí vzhled.

Soubory `*.dc.html` jsou rámy plátna Claude Design (artifact „FootAtlas prototyp Inkoust“), rozložení je v `canvas.json`. Pomocný `support.js`, na který se odkazují, dodává editor a do repa se neukládá. Obrázky jsou v `assets/` (autoři a licence: `assets/ZDROJE.md`), při nahrávání na plátno je potřeba nahrát i je.

## Vizuální jazyk

- **Atlas ve dvou vrstvách.** Krajina před vámi je tužková skica (šedé linky, šrafy, prázdné kroužky s otazníkem). Kudy jste prošli, tam se vybarví inkoustem a akvarelem: řeka zmodrá, střechy zokrovatí, lesy zezelenají, trasa je rumělkově rudá. Každý objev do mapy natrvalo přikreslí název a malou kresbu.
- **Odměny.** Zastávka = vosková pečeť s fotkou, malý objev = inkoustové razítko s kilometrem a dnem, kapitola = velká pečeť s oblouky postupu, konec etapy = pečeť s římskou číslicí a pohlednice. Zamčené věci jsou tužkou. Podrobně: rám `Pecete.dc.html`.
- **Písmo:** IM Fell English (a SC) na názvy, popisky a fakta, Work Sans na text a čísla.
- **Barvy:** papír `#EFE4CB`, karty `#F8F1E1`, inkoust `#2B2118`, rumělka `#9B2C22`, okr `#7F5718`, voda `#8FB7B4`, tmavá karta `#2B2118` s akcentem `#E0704A`.
- **Pohyb:** dopad razítka 600 ms s přestřelem, odstup razítek aspoň 250 ms, let kamery po trase 4–9 s (přeskočitelný), vše respektuje „Omezit pohyb“. Zvuk ve výchozím stavu vypnutý.
- **Texty** jsou krátké, s háčkem a lehkým humorem. Poznámky o ověřování v obrazovkách nejsou; patří do úkolů (níže).

## Scénář

Pondělí 2. listopadu 2026 ráno. Výprava Vltavská stezka běží od soboty 24. října, uživatel je na km 12,5 (40 m před Trojským zámkem). Od pátku ušel 9,1 km a odemkl 6 míst: Štvanice a Holešovický přístav (pátek), Libeňský most a plavební komora (sobota), Císařský ostrov a Trojská lávka (neděle). Za život 14 200 km od března 2019.

## Rámy

| Soubor | Obrazovka |
|---|---|
| `Aplikace.dc.html` | **Celý průchod s přechody.** Skládá ostatní rámy: návrat → Domů (vyjede zespodu), karta atlasu se rozbalí do mapy, hádanka přijede zprava, záložky se posouvají podle směru. Začněte tady. |
| `Main.dc.html` | Návrat „Inkoust“: let kamery po ušlé trase, dopadající razítka, počítadlo, panel „Cestou jste potkali“, příběhy objevů. Tweaks: tempo, Omezit pohyb. |
| `Pecete.dc.html` | Pečeti a razítka ve všech stavech, velikosti na mapě, kapitola, pečeť etapy, specifikace pohybu. |
| `Hadanka.dc.html` | Zamčená zastávka s hádankou a tipem, simulovaný příchod (fotka se zaostří, dopadne pečeť, odpověď). |
| `Pohlednice.dc.html` | Konec etapy: pohlednice, která se otáčí, rub skládaný z dat a objevů, náhled další etapy. |
| `Privoz.dc.html` | Přechod řeky přívozem jako malá scéna. |
| `Zastavka.dc.html` | Odemčená zastávka (Vyšehrad): fotka, pečeť, háček, „Až tam jednou půjdete“, deník a kapitola u místa. |
| `KartaZivota.dc.html` | První spuštění po načtení historie: zeměkoule s obloukem ušlé vzdálenosti, počítadlo, postřehy, poctivý rozpad čísla. |
| `Domu.dc.html` | Domů: výřez atlasu, postup, čísla dne, další zastávka s hádankou, „Kam dnes dojdu?“, nedávné objevy, kapitoly. |
| `Vyprava.dc.html` | Mapa na celou obrazovku, přiblížení na polohu, výběr místa razítkem. |
| `Objevovat.dc.html` | Rozjetá výprava, připravované cesty se seznamem přání, životní cesta, typy tras. |
| `Kronika.dc.html` | Zeměkoule a postřehy, Deník jako časová osa, Životní cesta po Hedvábné stezce, Rok den po dni, Sbírky. |

Obrazovky lze otevřít samostatně (mají vlastní spodní lištu) i vložené do `Aplikace.dc.html` (vlastnost `embedded`).

## Noční pergamen

Tmavý vzhled je volba v nastavení, výchozí je den. Každá obrazovka má vlastnost `vzhled` (`den` / `noc`, v Tweaks „Vzhled“); při `noc` dostane kořen třídu `.noc` a společný `noc.css` přebarví paletu: papír tmavne, ušlá trasa, razítka a poloha žhnou rumělkou, voda jemně svítí, tmavé karty (zeměkoule v Kronice, karta života) se naopak rozsvítí do pergamenu. Rámy `*-noc.dc.html` jen vkládají denní obrazovku s `vzhled="noc"`, takže se nemusí udržovat zvlášť.

`noc.css` vybírá prvky podle barvy v inline stylu nebo atributu SVG (hex i `rgb()` zápis). Je to záměrně jen pro prototyp; v aplikaci se tmavý vzhled řeší tokeny tématu (`apps/mobile/src/theme/tokens.ts`).

## Úkoly před použitím

- Všechna fakta, čísla a vzdálenosti v rámech jsou návrh. Seznam k ověření: [`docs/obsah-vltavska-podklady.md`](../obsah-vltavska-podklady.md), sekce „Úkoly k ověření“.
- Statistiky, rok den po dni a životní cesta jsou ukázková data.
- Kresba atlasu (čtvrti, lesy, dominanty) je stylizovaná podle trasy, v aplikaci ji nakreslí mapový styl ze skutečných dat.

## Archiv: první verze (`v1/`)

Původní statické obrazovky (karta života, domů, výprava, zastávka, kronika, konec etapy, objevovat; den i noc, scéna na km 35,6 u Kralup). Generuje je `nastroje/`:

- `mista.json` místa na trase, `stav.json` postup uživatele.
- `node trasa.mjs trasa` spočítá z mapových dat tok Vltavy a kilometr každého místa; `node trasa.mjs mapy` vykreslí mapy do `assets/` (potřebuje Playwright s Chromiem a přístup na tiles.openfreemap.org a unpkg.com).
- `python3 obrazovky.py` vygeneruje `v1/*.dc.html` v obou režimech.
