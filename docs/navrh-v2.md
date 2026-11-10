# Návrh v2: Výprava, Mezitím, nový let a razítka s kresbou

Stav: návrh k realizaci (rozhodnutí 0030) · 9. 11. 2026
Vychází z: tří videí průchodu na telefonu (motorola edge 50 fusion, 9. 11. 2026), [specifikace](specifikace.md) (§ 4, § 8, § 9.3, § 10), [návrhu prožitku](navrh-prozitek.md), [rozboru prototypu](design-prototyp.md) a [názvosloví](nazvoslovi.md).

Tento dokument nahrazuje § 8 specifikace (navigace) a doplňuje návrh prožitku. Kde se s nimi rozchází, platí tento dokument.

---

## 1. Co jsme zjistili

### 1.1 Struktura nedává smysl

- **Domů a Výprava ukazují totéž.** Domů je seznam o aktuální výpravě (postup, další zastávka, kapitoly), Výprava je táž výprava na mapě. Chodec neví, kam co patří.
- **Kapitoly patří k výpravě, ale zobrazují se na Domů a ve Sbírkách v Kronice.** Kronika má být celý život, ne jedna výprava.
- **„Dnes“ po pěti dnech lže.** Úvodní obrazovka neodpovídá na otázku „co je dnes“, ale „co se stalo, než jsem přišel“. Specifikace to říká sama (§ 4.4 „Každé otevření aplikace něco dá“, § 9.3 „Vítejte zpět. Mezitím jste došli k…“, § 10 „Odměna za návrat, ne za pravidelnost“). Není to záložka, je to **chvíle**.
- **„Kam dnes dojdu“ je kalkulačka.** Čtyři čipy (1, 2, 4 km, konec etapy) a věta. Nic neříká o chodci, nic neláká.

### 1.2 Let návratu: plynulý, ale špatný

Po opravě 0028 se mapa hýbe v každém snímku. Jako zážitek ale let nefunguje:

1. **Kamera honí tečku zblízka** (měřítko 500 m). Chodec nevidí, odkud a kam jde; působí to jako tahání za vodítko.
2. **Stůj–jeď.** Před místem kamera zpomalí, 3–6 s stojí a pak vyrazí rovnou plnou rychlostí, bez rozjezdu (nejvíc po Kralupech).
3. **Barva krajiny naskakuje po šestinách úseku** (maska `revealMask` se přepočítává v 6 krocích). Najednou se objeví celý blok zeleně.
4. **Nic se nekreslí.** Slogan je „Atlas, který kreslíte nohama“, ale čára se jen prodlužuje. Chybí hrot pera, inkoust, papír, který se kolem barví.
5. **Konec etapy je červená skvrna** (plný kruh bez obrázku), vypadá jako kaňka.
6. **Karta místa zakryje třetinu mapy**; záhlaví se uřízne („Zastávka · km 33,7 · konec e…“), razítko přečnívá přes roh, objevy bez fotky mají prázdný papírový rámeček.
7. **Konec ukazuje tabulku, ne cestu.** Mapa se scvrkne na pruh ~110 px, názvy míst jsou useknuté.
8. **Mapa je přeplněná** šrafováním a stromečky; cesta se v nich ztrácí.
9. **Žádná haptika.** Razítko dopadne bez ťuknutí.

### 1.3 Razítka s písmeny nic neříkají

Monogramy („Vy“, „RN“, „ZdH“) jsou nečitelné. Razítko má na první pohled říct, **co to místo bylo**.

---

## 2. Konkurence: co převzít a co ne

| Aplikace | Co dělá dobře | Co převezmeme | Co ne |
|---|---|---|---|
| **Pikmin Bloom** ([Daily Lookback](https://niantic.helpshift.com/hc/en/23-pikmin-bloom/faq/2859-daily-lookback), [týdenní shrnutí](https://gonintendo.com/contents/14208-pikmin-bloom-gets-weekly-lookback-feature)) | Shrnutí dne jako krátký animovaný obřad; chodec je divák. K shrnutí jde napsat krátkou poznámku do deníku (Lifelog). Týdenní ohlédnutí v neděli. | Přehrání jako obřad, ne nástroj. Možnost připsat větu k přehranému úseku. Týdenní shrnutí (spec § 9.5). | Pevný čas (21:00) a upozornění k němu: odporuje principu „žádný nátlak“. Shrnutí se u nás váže na **otevření aplikace**, ne na hodinu. |
| **Relive** ([TechCrunch](https://techcrunch.com/2017/05/02/relive)), **COROS** ([flyover](https://coros.com/ca/stories/coros-metrics/c/3D-flyover-videos)) | Let začíná záběrem na celou trasu, kamera je nakloněná a oddálená, fotky „vyskakují“ v místě vzniku a let se kvůli nim nezastavuje. | Úvodní záběr, oddálená kamera, místa se ukazují **za letu**, závěrečný záběr na celý úsek. | 3D terén a hudba (zatím); sdílení videa (později). |
| **The Conqueror** ([recenze](https://hometechhacker.com/the-conqueror-virtual-challenges-review-motivation-medals-and-miles/)) | Recenzenti chválí mapu a pohlednice, které „učí o místech“. | Potvrzuje směr: pohlednice a obsah míst jsou hodnota. | Placený model a medaile jako hlavní motivace. |
| **World Walking** ([App Store](https://apps.apple.com/gb/app/world-walking/id704301914?ls=1)), Walk the World (spec § 2.1) | Pas s razítky, fakta a fotky o místech. | Sběratelský pas. | Obecná, stejná razítka. Naše odlišení: **každé razítko má kresbu místa**. |
| **Turistické známky a výletní razítka** (česká tradice) | Každé místo má vlastní kresbu; lidé je sbírají celý život. | Předloha pro razítka (§ 6). Pro české chodce okamžitě srozumitelné. | — |

---

## 3. Informační architektura: tři záložky

| Záložka | Odpovídá na | Obsah |
|---|---|---|
| **Výprava** (otevírá se jako první) | Kde jsem na cestě? | Mapa přes celou obrazovku a vysouvací panel (§ 4). Nahoře pruh **Mezitím** (§ 5), když je co přehrát. |
| **Atlas** | Co jsem nasbíral a kam dál? | Výpravy (aktuální, dokončené, připravované, výběr další), **razítka** (po výpravách a etapách), **témata** napříč výpravami (§ 7), pohlednice. |
| **Kronika** | Jak chodím za celý život? | Deník (po dnech, s „Přehrát den“), Životní cesta (zeměkoule, „kam až byste došli z Prahy“), Rok. **Bez Sbírek** (ty se stěhují do Atlasu). |

- **Domů zaniká.** Jeho obsah se rozdělí: „Od posledně“ → pruh Mezitím; postup etapy, další zastávka, kapitoly → panel Výpravy; dlaždice Dnes / Za 7 dní → Kronika, Deník (hlavička); „Nedávno odemčeno“ → panel Výpravy (sekce Místa).
- **Objevovat zaniká** a stává se sekcí Atlasu („Další výpravy“).
- **Nastavení** zůstává ikonou v záhlaví (Výprava i Kronika).
- **Bez aktivní výpravy** (před první a mezi výpravami) ukazuje Výprava výběr výpravy (dnešní obrazovka „Vyrazit“) a pod ním Životní cestu.

Proč tři: každá záložka má jednu otázku a žádná neukazuje kus jiné. Tři záložky jsou na telefonu čitelnější než čtyři a odpovídají třem vrstvám produktu (výprava, sbírka, život; spec § 5).

---

## 4. Výprava: mapa a panel

Mapa jako dnes (atlasový styl). Panel má tři polohy: **sbalený** (jen hlavička), **poloviční** (výchozí), **celý**.

Obsah panelu shora:

1. **Hlavička:** „Etapa III · Plavební kanál Vraňany“ a pruh etap; vpravo „39,4 z 62 km“.
2. **Další cíl** (jedna karta): vybírá se nejlákavější z kandidátů v tomto pořadí:
   1. dokončení etapy do 3 km („1,2 km do pohlednice etapy III“),
   2. uzavření kapitoly do 3 km („Ještě 1 místo do uzavření Mostů a lávek“),
   3. další zastávka (medailon, vzdálenost v metrech i krocích, hádanka, odkaz „Tipnout si“).
   Klepnutí otevře místo (nebo kapitolu).
3. **Před vámi** (náhrada „Kam dnes dojdu“, § 4.1).
4. **Kapitoly této výpravy:** nejbližší neuzavřená nahoře, ostatní sbalené („Všechny kapitoly“). Vysvětlující věta jen do prvního otevření kapitoly (už je).
5. **Místa:** po etapách, odemčená s datem, zamčená s km. „Nedávno odemčeno“ jako první řádek.

### 4.1 Před vámi

Pás trasy (asi 8 km před chodcem, vodorovně posuvný) s místy jako razítky (zamčená = slepý obrys se symbolem, § 6). Nad pásem odhad podle vlastního tempa:

- „Obvykle ujdete 6,2 km denně. Za 2 dny jste u Zámku Veltrusy a Červeného mlýna.“ Tempo = průměr posledních 14 dní s pohybem (data už jsou v kronice). Bez historie: „Za 30 minut chůze (asi 2 700 kroků) jste u Zámku Veltrusy.“
- Pojmenovaná odměna, je-li v dosahu: „Do pohlednice etapy III: 12,1 km.“
- Táhnutím prstem po pásu se ukazatel posouvá a text se mění („Do sem: 4,0 km, asi 50 minut, 3 místa“). Nic se neukládá.
- Bez slova „dnes“.

---

## 5. Mezitím: návrat po pauze

**Mezitím** je chvíle, ne obrazovka v záložkách. Objeví se, když od posledního přehrání přibylo ≥ 300 m nebo místo (podmínka jako dnes, rozhodnutí 0022 a 0024).

- **Pruh nahoře na Výpravě:** „Mezitím · 23,4 km za 5 dní · 3 nová místa“ a tlačítko **Přehrát cestu**; vedle „Zavřít“.
- **Přes celou obrazovku sám** (s možností přeskočit), když se mezitím dokončila etapa, nebo když od posledního otevření uplynuly ≥ 3 dny. Jinak jen pruh.
- **Nadpis podle doby:** „Mezitím přibylo“ (méně než den), „Od včerejška přibylo“, „Za 5 dní přibylo“, „Od 24. 10. přibylo“. Nikdy „Dnes“.
- **Spotřebování** jako dnes (0024): přehráním do konce nebo „Zavřít“.
- **Poznámka k úseku** (po vzoru Pikmin Bloom): na konci přehrání nenápadné „Připsat větu do deníku“. Uloží se k dnům úseku v Kronice. Volitelné, nic se nepřipomíná.
- **Týdenní shrnutí** (spec § 9.5) je pozdější krok, ale používá stejné přehrání (úsek týdne).

---

## 6. Razítka s kresbou

### 6.1 Sada symbolů (krok 1)

Každé místo dostane v obsahu pole `symbol`. Razítko = kruhový rámeček (název nahoře, km a datum dole) a **kreslený symbol uprostřed**, jednou linkou inkoustu, ve stylu atlasu. Odemčené razítko je rumělkové, zamčené slepý obrys se stejným symbolem (chodec vidí, že ho čeká most, ne co přesně).

| Symbol | Kresba | Místa Vltavské stezky |
|---|---|---|
| `hradiste` | val s palisádou na kopci | Vyšehrad, Levý Hradec, Klecanské hradiště |
| `zamek` | průčelí se dvěma věžemi | Trojský zámek, Zámek Roztoky, Zámek Nelahozeves, Zámek Veltrusy, Zámek Hořín |
| `most` | kamenný oblouk se dvěma pilíři | Karlův most, Libeňský most |
| `lavka` | lehký oblouk lávky | Trojská lávka, Lávka do Bukolu |
| `ostrov` | ostrůvek se stromy ve vlnách | Ostrov Štvanice, Císařský ostrov |
| `zdymadlo` | vrata plavební komory | Plavební komora Troja, Plavební kanál Vraňany, Zdymadlo Hořín |
| `pristav` | kotva | Holešovický přístav |
| `privoz` | loďka s veslem | Přívoz v Podbabě, Přívoz do Letek |
| `vor` | vor z klád | Výtoň, Rašínovo nábřeží |
| `skala` | skalní stěna nad vodou | Sedlecké skály, Skály u Řeže |
| `obec` | kostelní věž a střechy | Husinec, Libčice nad Vltavou, Dolany nad Vltavou, Kralupy nad Vltavou, Lobeček, Vepřek, Mlčechvosty, Lužec nad Vltavou |
| `nota` | nota a lyra | Rodný dům Antonína Dvořáka |
| `mlyn` | mlýnské kolo | Červený mlýn |
| `vyhled` | hora na obzoru | Výhled na Říp, První pohled na Mělník |
| `rakos` | rákosí ve vodě | Slepé rameno, Říční tůně |
| `soutok` | dvě vlny, které se spojují | Soutok v Mělníku |

Symboly jsou SVG komponenty (react-native-svg), kreslené ve stejné tloušťce linky, čitelné od 28 px. Monogram zůstává jen jako záloha pro místo bez symbolu.

### 6.2 Kresby zastávek (krok 2)

Každá **zastávka** (10 míst) dostane vlastní kresbu jako turistická známka (Trojský zámek, Karlův most…). Objevy si nechají symbol. Kresby připraví člověk nebo ilustrátor; v aplikaci je jen pole `stampArt` s odkazem na obrázek. Do té doby platí symbol.

### 6.3 Pečeti etap a kapitol

- **Pečeť etapy:** vosk s římským číslem a drobnou kresbou cíle etapy (symbol posledního místa). Žádný plný kruh bez obsahu.
- **Pečeť kapitoly:** vosk se symbolem kapitoly (Voraři = vor, Mosty a lávky = most, Ostrovy = ostrov, Počátky Čech = hradiště, Šlechtická sídla = zámek).

---

## 7. Kapitoly a témata

Dvě úrovně, aby šlo kapitolu uzavřít a přitom výpravy mohly přibývat:

| | Kapitola | Téma |
|---|---|---|
| Patří k | jedné výpravě | celému atlasu |
| Počet míst | pevný („Mosty Vltavské stezky 3/4“) | roste s každou výpravou |
| Konec | uzavře se pečetí | nekončí; má milníky |
| Kde žije | Výprava (panel) | Atlas |
| Příklad | Mosty a lávky (Vltavská stezka) | Mosty: Vltava 4, Labe 3, … |

- **Datový model:** kapitola má `themeId`. Téma je samostatná položka obsahu (`id`, `title`, `titleGenitive`, `symbol`, `intro`, `milestones: [3, 10, 25]`). Kapitoly různých výprav se stejným `themeId` se v tématu sčítají.
- **Obrazovka tématu (Atlas):** název, úvod, pečeti uzavřených kapitol (po výpravách), počet odemčených míst tématu a nejbližší milník („Ještě 2 mosty do milníku 10 mostů“).
- **Při výběru výpravy** (Atlas, Další výpravy): „Tato výprava přidá 3 mosty do tématu Mosty.“
- Pro Vltavskou stezku: témata `vorari`, `mosty`, `ostrovy`, `pocatky`, `sidla` (1:1 s dnešními kapitolami). Obrazovka tématu má smysl až s druhou výpravou; do té doby se v Atlasu ukazuje jen jako sekce s jednou kapitolou.

---

## 8. Nový let (přehrání cesty)

Cíl: obřad o 20–25 s (max. 40 s), během kterého se atlas **kreslí**.

### 8.1 Střih

| Fáze | Délka | Co se děje |
|---|---|---|
| **Úvodní záběr** | 2,0 s | Kamera ukáže celý úsek (start, cíl, další zastávka na obzoru), vlevo nahoře „Mezitím · 23,4 km“. |
| **Ponoření** | 1,0 s | Plynulý přesun na start úseku, oddálení přiměřené délce úseku (≈ 2–3 km na šířku obrazovky, ne 500 m), mírný náklon (pitch 30°). |
| **Kreslení** | podle délky (8–20 s) | Kamera sleduje cestu s předstihem (střed ~20 % před hrotem), čáru kreslí **hrot pera** (malá kresba pera na konci čáry; *nahrazeno koncem čáry s inkoustovou tečkou, balík P, rozhodnutí 0033*), papír se kolem cesty barví **plynule** (bez skoků po šestinách). |
| **Místo za letu** | — | Kamera zpomalí na ~25 % rychlosti (rozjezd i dojezd 0,6 s s easingem), razítko dopadne (600 ms, přestřel, haptika), nahoře vyjede **štítek místa** (symbol nebo fotka, typ, název, jedna věta; max. 25 % výšky). Let **nezastaví**. Štítek zůstane 2,5 s. |
| **Zastávka a konec etapy** | 3,5 s / 5 s | Plné zastavení s plynulým dojezdem a rozjezdem (0,8 s), větší karta (fotka, háček), u konce etapy pečeť etapy (§ 6.3). Klepnutí otevře místo. |
| **Závěrečný záběr** | 1,5 s | Oddálení na celý úsek s vybarvenou cestou a všemi razítky na mapě. |
| **Souhrn** | — | Panel vyjede jen do 40 % výšky (*balík P: 44 %, rozhodnutí 0033*); mapa zůstává vidět. Místa jako řada razítek se symboly (ne useknutý text ve dvou sloupcích). Bez nového místa „Na obzoru“ (už je). |

### 8.2 Pravidla

- **Hodiny:** jedny (`useClock`); kamera dostává pokyny po úsecích (0028), ale rychlost je **spojitá funkce** času: žádné skoky rychlosti po zastavení.
- **Maska barvy:** plynulá. Buď častější přepočet jen kolem hrotu (malý polygon za posledních ~500 m, sloučený s hotovou maskou po dokončení úseku), nebo vrstva `line` s velkou šířkou a rozmazáním (`line-blur`) pod cestou místo polygonu. Vybrat to, co na telefonu udrží 60 fps.
- **Méně šumu:** při letu ztlumit vzory (šrafování, stromy) na ~50 % krytí; po skončení vrátit.
- **Haptika** (`expo-haptics`): lehké ťuknutí při razítku, střední při pečeti. Vyžaduje nový nativní build.
- **Přeskočení:** „Přeskočit“ vpravo nahoře skočí na závěrečný záběr; klepnutí na štítek nebo kartu otevře místo a pozastaví.
- **Omezit pohyb:** úvodní a závěrečný záběr bez letu, razítka se jen prolnou.
- **Ověření na zařízení je povinné.** Emulátor ani web nestačí.

---

## 9. Názvosloví (doplnění [nazvoslovi.md](nazvoslovi.md))

| Pojem | Význam |
|---|---|
| **Mezitím** | Chvíle po otevření aplikace, kdy přibyl pohyb. Nadpis „Mezitím přibylo“, „Za 5 dní přibylo“. |
| **Před vámi** | Pás trasy před chodcem s odhadem podle tempa. Nahrazuje „Kam dnes dojdu“. |
| **Atlas** | Záložka sbírky a výběru výprav. Nahrazuje „Objevovat“ a Sbírky v Kronice. |
| **Téma** | Řada kapitol napříč výpravami (Mosty, Šlechtická sídla). Roste, nekončí. |
| **Symbol** | Kresba typu místa na razítku (most, zámek, mlýn…). |
| Nepoužívat | „Domů“, „Dnes“ jako název obrazovky, „Objevovat“, „Kam dnes dojdu“. |

---

## 10. Balíky

| Balík | Obsah | Hlavní soubory | Závisí na |
|---|---|---|---|
| **K · Nový let** | § 8 bez haptiky | `app/navrat.tsx`, `components/FlightMap.tsx`, `components/HaltCard.tsx`, `src/navrat.ts`, `components/useClock.ts` | — (razítka převezme z `Seal` automaticky) |
| **L · Tři záložky a Mezitím** | § 3, § 4, § 4.1, § 5 (bez poznámky do deníku) | `app/(tabs)/*`, `app/_layout.tsx`, `components/HomeSections.tsx` → panel Výpravy, `components/ReturnCard.tsx` → pruh Mezitím, Atlas (nová obrazovka skládající stávající komponenty) | — |
| **M · Razítka se symboly** | § 6.1, § 6.3 | `components/Seal.tsx`, nové `components/stamps/*`, pole `symbol` v `packages/content`, `monogram.ts` jako záloha | — |
| **N · Témata (model)** | § 7: datový model, `themeId`, loader, logika `temata.ts` s testy, bez obrazovky | `packages/content`, `apps/mobile/src/temata.ts` | — |
| později | Haptika a nový build; kresby zastávek (§ 6.2); obrazovka tématu; poznámka do deníku; týdenní shrnutí | | K, M, N |

Pořadí slučování: N → M → K → L (L je největší a sahá na nejvíc obrazovek; střety řeší až na konci).

## 11. Otevřené otázky

- Má se Mezitím přes celou obrazovku pouštět samo už po 3 dnech, nebo jen po dokončené etapě? (Návrh: obojí, s „Přeskočit“.)
- Náklon kamery (pitch) na atlasovém stylu: ověřit, že kresba a popisky v náklonu nepůsobí rozmazaně. Pokud ano, zůstat u 0°.
- Kdo nakreslí sadu 16 symbolů: v balíku M je nakreslí agent jako jednoduché SVG; výtvarnou kvalitu má doladit člověk.
