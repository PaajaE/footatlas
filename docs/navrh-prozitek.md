# Návrh: z počítadla kilometrů živá výprava

Verze 1 · 2. 11. 2026 · Vychází z větve `dev/android-verifikace` (APK 1.4.0) a z testu na telefonu (4 screenshoty: Domů, Trojský zámek, Císařský ostrov, Výprava).

Tento dokument je **návrh**, ne rozhodnutí. Na konci je pořadí prací a otázky k rozhodnutí.

---

## 1. Co se na telefonu stalo (zpětná vazba bez obalu)

Uživatel ráno otevřel aplikaci po 9,1 km chůze. Aplikace mu ukázala:

| Co viděl | Proč je to špatně |
|---|---|
| Tmavou obrazovku se statickým textem „Od posledně jste ušli 9,1 km. Přibylo 6 malých objevů.“ | Největší odměna celé aplikace (návrat po chůzi) je jedna věta v šedé kartě. Žádný pohyb, žádné jméno objevu, nic k rozkliknutí. Šest objevů se „stalo“, ale uživatel se nedozví, co to bylo. |
| „Další zastávka · 0,0 km“ a v seznamu „Trojský zámek 0,0 km“ | Zastávka je ve skutečnosti pár desítek metrů před ním (km 12,545, ušlo se ~12,5). Formát s jedním desetinným místem kilometru zaokrouhlí 40 m na nulu. |
| Detail zastávky: „Zatím zamčeno · Odemkne se za 0,0 km.“ | Rozpor: nula a přitom zamčeno. Pod 1 km se musí ukazovat metry a kroky. |
| Odemčený Císařský ostrov: „Největší pražský ostrov.“ + „Toto místo jste už minuli.“ + „Koncept obsahu…“ | Odemčení nic nepřineslo. Odměna je prázdná, navíc přiznává, že je to ukázkový text. Konkurence (Walk the Distance) je kritizována přesně za tohle a my jsme si slíbili opak (spec 2.3, bod 3). |
| Mapa: trasa vede středem Vltavy | Je to tok řeky z OSM (`route.json`), ne cesta. Na mapě to vypadá, že člověk plave. U „chodící“ aplikace to boří iluzi. |
| Aplikace nechaná otevřená se nezmění | Vzdálenost se čte jen při startu aplikace (`ExpeditionProvider`, `useEffect` při načtení). Žádný návrat z pozadí, žádný interval, žádné „stáhni a obnov“. |
| Tmavý vzhled | Téma se řídí systémem (`ThemeProvider`, `choice: "auto"`). Pergamenový světlý styl je přitom to, co aplikaci dává charakter. |
| Mapová stránka | Tu se líbí. Medailony, ušlý úsek, „Celá trasa“. Je to nejlepší obrazovka a návrh na ní staví. |

### Hlubší problém

Aplikace dnes **sděluje stav**, ale **neprožívá cestu s uživatelem**. Spec slibuje „Každé otevření aplikace něco dá“ (princip 4) a „Při odemčení krátká animace na mapě, malý příběh“ (9.2). Ani jedno v aplikaci není. Domů je výpis, ne uvítání. Čísla jsou správně, ale nic se *neděje*.

Tři chybějící vrstvy:

1. **Okamžik** – návrat do aplikace má být malá událost: „podívej, kam jsi došel“.
2. **Obsah** – každé místo musí stát za to, aby ho člověk otevřel. Jeden překvapivý fakt je víc než tři věty encyklopedie.
3. **Živost** – aplikace má reagovat na to, že člověk chodí, i když ji nechá otevřenou, a (později) dát vědět, když dojde někam důležitého.

---

## 2. Co si vzít od konkurence

Neopisujeme; bereme mechaniky, které fungují, a vynecháváme ty, které odporují našim principům (žádné série, žebříčky, nátlak).

| Aplikace | Co dělá dobře | Co si vezmeme | Čemu se vyhneme |
|---|---|---|---|
| **The Conqueror** | Pohlednice u milníků s textem o okolí trasy; pohled ze Street View na aktuální pozici; strom zasazený za každých 20 % trasy. Uživatelé to popisují jako hlavní důvod, proč pokračovat. | **Pohlednice z etapy** (už ve spec 9.4, chybí v aplikaci). **„Pohled z místa“**: velká fotka toho, kde právě jsem. Symbolický „dárek“ za čtvrtiny trasy. | Vše placené, fyzické medaile jako jediná odměna. |
| **Pikmin Bloom** (Niantic) | Chůze jako tichý společník; pohlednice přinesené z „cest“; **lifelog** – denní deník, kam se vrací; mapa se postupně stává osobním deníkem. | **Denní záznam v Kronice** („úterý: 6,2 km, Karlův most, Štvanice“). Mapa zaplněná *mými* daty (datum u každého medailonu). | Měna, obchod, sbírání pro sbírání. |
| **Walk the World / World Walking** | Pas s razítky, poštovní karty. Kritika: dlouhá trasa, na mapě se nic neděje. | **Razítka v pasu** jako vizuální forma odemčených míst. Hustota míst (už máme lepší než oni). | Prázdná mapa, chybějící důvod se vracet. |
| **Walk the Distance** | Skutečné trasy, synchronizace zdravotních dat. Kritika: zastávka = obrázek + odkaz na Wikipedii. | Nic navíc; je to příklad, čím **nesmíme** být. | Prázdné zastávky (to máme teď!). |
| **Apple Fitness / Google Fit** | Animace dovršení (kroužky se dotočí), **widgety** na ploše, týdenní shrnutí. | **Animace postupu při otevření**, **widget** „do Trojského zámku 1,2 km“, týdenní shrnutí. | Denní cíle a tlak na sérii. |
| **Strava / Komoot** | Komoot: trasa po skutečných cestách, „highlights“ s tipy. Strava: krásné sdílecí obrázky. | Trasa **po cestách, ne vodou**. Sdílecí karta (pohlednice) jako obrázek. | Sociální síť, výkon. |
| **Duolingo** (jen jako protipříklad) | Velmi účinné notifikace. | Pečlivé načasování a personalizace upozornění. | Pocit viny, série, „sova vás pozoruje“. |

Zdroje: [The Conqueror review (HomeTechHacker)](https://hometechhacker.com/the-conqueror-virtual-challenges-review-motivation-medals-and-miles/), [Is The Conqueror legit](https://abusonadustyroad.com/is-the-conqueror-virtual-challenge-legit-10-things-to-know-and-understand), [Best virtual challenges](https://abusonadustyroad.com/best-virtual-challenges-and-why-we-love-them), [Virtual walking challenge apps](https://walking-startup.uk/blog/virtual-walking-challenge-apps), [Design critique: Pikmin Bloom](https://ixd.prattsi.org/2026/02/design-critique-pikmin-bloom-iphone-app/), [Pikmin Bloom launch](https://indigo-pearl.prezly.com/niantic-and-nintendo-launch-pikmin-bloom-an-app-that-brings-a-little-joy-to-your-everyday-journeys-on-foot-p3jm6x), [Pikmin Bloom (Engadget)](https://www.engadget.com/pikmin-bloom-has-been-helping-me-meet-my-outdoor-walking-goals-for-years-000025214.html), [Health Connect: čtení dat](https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data). Hodnocení konkurence vychází z veřejných recenzí, ne z vlastního testu placených částí.

**Shrnutí:** Nikdo z konkurence nemá dohromady (a) živý návrat po chůzi, (b) opravdu zajímavý obsah každého místa a (c) mapu, která je deníkem. To je naše místo.

---

## 3. Vize prožitku v jedné scéně

> Ráno otevřu aplikaci. Na světlém pergamenu se mapa krátce přiblíží k místu, kde jsem byl naposledy, a moje tečka **dojde po trase** k Trojskému zámku. Po cestě se postupně rozsvítí tři medailony. Nahoře: „Od pátku jste ušli 9,1 km. Prošli jste Prahou od Štvanice až do Troji.“
>
> Pod tím karta „**Co jste potkali**“: Plavební komora Troja, Císařský ostrov, Trojská lávka… Klepnu a listuju jako příběhem: velká fotka, jedna věta, **jeden fakt, který jsem nevěděl**, „došli jste sem ve čtvrtek 30. října“.
>
> Na konci: „Trojský zámek je **40 metrů** před vámi (asi 55 kroků). Až ho dojdete, uvidíte, proč má schodiště plné bojujících obrů.“
>
> Nechám aplikaci otevřenou a jdu ven. Když se vrátím a odemknu telefon, čísla se samy posunou a zámek se odemkne přímo před očima.

---

## 4. Návrhy změn

Každý návrh má prioritu: **P0** = opravit hned (chyby, které podkopávají důvěru), **P1** = jádro nového prožitku, **P2** = rozšíření, **P3** = později.

### 4.1 P0 – Opravy, které nepočkají

**A. Vzdálenosti, které dávají smysl**

- Pod 1 km ukazovat **metry** zaokrouhlené na 10 m („40 m“, „350 m“), nad 1 km kilometry s jedním desetinným místem, nad 10 km celé kilometry.
- Pod 1 km přidat **kroky** z osobní délky kroku: „350 m · asi 470 kroků“. Kroky jsou pro krátké vzdálenosti srozumitelnější než metry a máme kalibraci (rozhodnutí 0006).
- Nikdy nezobrazit „0,0 km“. Pod 15 m: „**Jste tady**“ (a místo už je fakticky na dosah – viz odemčení níže).
- Jedna funkce `formatDistance(m, { stepLengthM })` v `format.ts`, používaná všude (Domů, Výprava, detail, seznam „Na dalších 5 km“). Dnes je formátování rozkopírované na 5 místech (i ruční `toFixed(1)` ve `vyprava.tsx`).
- Detail zamčeného místa: „Odemkne se za 40 m (asi 55 kroků)“. Text „Toto místo jste už minuli“ nahradit datem: „Došli jste sem ve čtvrtek 30. října“ (data už máme v `expedition_event`).

**B. Světlý vzhled jako výchozí pro všechny**

- `ThemeProvider`: výchozí volba `"light"` místo `"auto"`; `app.json`: `userInterfaceStyle: "light"`.
- Tmavý režim zůstává jako volba v nastavení (Světlý / Tmavý / Podle systému), výchozí světlý. Mapa už den/noc přepínat umí.

**C. Trasa po souši, ne Vltavou**

- Nahradit tok řeky **pěší trasou po nábřežích, stezkách a cyklostezkách** (A2 / Vltavská cyklostezka v Praze, dále podél břehu, přívozy Podbaba–Podhoří a Libčice–Letky jako přechody).
- První pokus (pěší routing OSRM nad OSM přes 27 průchozích míst, provedený a zahozený při psaní tohoto návrhu): **~89 km** místo 62 km, odchylky míst od trasy většinou do 50 m, ale s objížďkami (Vraňany–Lužec–Mělník přes 14 km). Po ručním doladění průchozích bodů a přívozů lze čekat **zhruba 70–80 km**. Úkoly:
  - skript `tools/route/` (průchozí body + pěší routing + zjednodušení + nové `unlockAtM`),
  - nové konce etap (asi 5 etap místo 4, aby etapa zůstala 15–20 km, spec 7.1),
  - dotáhnout hustotu míst (spec 7.2) – delší trasa potřebuje 4–6 nových malých objevů,
  - ověřit, že koridor mapy (`vltava-koridor5`) pokrývá novou trasu,
  - aktualizovat `pilot.test.ts` (délka, počty, známá mezera).
- Alternativa, pokud chceme zachovat 62 km: kreslit trasu jako „podél řeky“ odsazenou na břeh. Nedoporučuji – je to kosmetika a typ trasy by lhal.

**D. Aktualizace bez restartu**

- Obnovit data při **návratu aplikace do popředí** (`AppState` → `active`), při **přepnutí na záložku** Domů/Výprava a gestem **stáhnout dolů** (`RefreshControl`).
- Když je aplikace v popředí, obnovovat **každých 60 s** (jen agregovaný součet za interval od posledního čtení; levné). Nic neběží, když je obrazovka zhasnutá.
- Poctivě vysvětlit zpoždění: Health Connect sám kroky nepočítá, zapisuje je tam Google Fit / Samsung Health / hodinky, často po dávkách (minuty až desítky minut). V aplikaci drobně: „Aktualizováno před 2 min · zdroj zapisuje s prodlevou“.

### 4.2 P1 – Jádro nového prožitku

**E. „Cesta od minula“ – uvítání po návratu** (nahrazuje šedou kartu)

Když od posledního zobrazení přibylo ≥ 100 m nebo nějaké místo:

1. **Animovaný postup** (1,5–2,5 s, přeskočitelný klepnutím): pruh etap se doplní z minulé hodnoty na novou, číslo kilometrů naroste, na malé mapě (nebo na náhledu `RouteSketch`) tečka dojde po trase a medailony po cestě se postupně rozsvítí. Respektovat „Omezit animace“ v systému.
2. **Lidská věta místo statistiky**: „Od pátku jste ušli 9,1 km. Prošli jste Prahou od Štvanice až do Troji.“ (Úsek pojmenovat podle prvního a posledního místa, případně etapy.)
3. **Karta „Co jste potkali“**: řada medailonů / dlaždic s názvy nově odemčených míst. Klepnutí otevře **příběhový prohlížeč** (F).
4. **Co dál**: „Trojský zámek je 40 m před vámi“ s náhledem slibu („…uvidíte, proč má schodiště plné bojujících obrů“) – teaser, ne celý fakt.
5. Při dokončení etapy místo věty **pohlednice etapy** (H).

Stav „viděno“ (`markSeen`) se posune až po zhlédnutí, jako dnes.

**F. Příběhový prohlížeč objevů**

- Celoobrazovkové listování nově odemčenými místy (styl „stories“, ale bez časovače – vlastním tempem): fotka nebo ilustrace přes horní polovinu, typ a kilometr, název, **překvapivý fakt** zvýrazněný, 2–3 věty, „došli jste sem ve čtvrtek“, odkaz „Ukázat na mapě“.
- Tečky postupu nahoře („3 z 6“), poslední karta = „Co vás čeká“.
- Stejný prohlížeč slouží i z Kroniky („projít všechna místa výpravy“) – opakované čtení je v pořádku.

**G. Obsah míst, který stojí za odemčení**

Šablona (spec 7.3) se má naplnit *teď*, ne „před vydáním“. Navrhuji upravit důraz:

- **Háček (fakt)** – jedna věta, kvůli které člověk řekne „aha“. Povinné i u malých objevů.
- **Kontext** – 2–3 věty, jak to souvisí s řekou a s cestou (proč je to tady).
- **„Až tam budete“** – co by člověk na místě skutečně uviděl (pro ty, kdo jednou půjdou fyzicky).
- **Teaser** – půl věty pro náhled před odemčením („…proč tu vory platily clo“).
- Fotka s licencí, 2 zdroje, datum ověření (beze změny).

Ukázky směru (k ověření dvěma zdroji před vydáním):

| Místo | Dnes | Návrh háčku |
|---|---|---|
| Karlův most | „Kamenný most ze 14. století.“ | Základní kámen se podle tradice pokládal 9. 7. 1357 v 5:31 – čísla 1-3-5-7-9-7-5-3-1 tvoří palindrom. Až do roku 1841 to byl jediný most přes Vltavu v Praze. |
| Trojský zámek | „Barokní letohrádek s francouzskou zahradou.“ | Vnější schodiště zdobí souboj olympských bohů s giganty – obři padají do hlubin pod schody. Stavěl ho pro Šternberky Jean Baptiste Mathey (1679–1685). |
| Levý Hradec | „Hradiště, kde podle tradice stál první kostel v Čechách.“ | Právě tady byl v roce 982 zvolen pražským biskupem Vojtěch – pozdější svatý Vojtěch. |
| Soutok v Mělníku | „Vltava se tu vlévá do Labe.“ | Vltava přináší do soutoku víc vody než Labe – hydrologicky je tedy „hlavní“ řekou ona, jen jméno zůstalo Labi. |
| Výtoň | „Bývalá celnice…“ | Clo se platilo ze dřeva plaveného po řece; budova celnice je dnes nejstarší dochovanou stavbou Podskalí. |
| Nelahozeves / Dvořák | „Skladatel se tu narodil roku 1841.“ | Dvořák se narodil v rodině řezníka a hostinského; vlaky na trati za domem ho fascinovaly celý život. |

Také **tematické kapitoly** (spec 7.4, úroveň 2) jako nitky přes více míst: *Voroplavba* (Výtoň → náplavka → Libčice → …), *Šlechtická sídla na řece* (Troja → Roztoky → Nelahozeves → Veltrusy), *Řeka a povodně* (2002: Veltrusy, Lužní les, tůně). Odemčení třetího místa kapitoly = malý milník.

Prakticky: obsah je úzké hrdlo (spec 7.6). Navrhuji pro Vltavskou stezku „redakční sprint“: nejdřív háček + teaser pro všech 38 míst (krátké, rychle ověřitelné), plné texty postupně.

**H. Pohlednice z etapy a z cíle**

- Na konci etapy: obrazovka pohlednice – ilustrace/fotka úseku, mapa etapy, „18,6 km, 12 míst, 6 dní (od 24. do 30. října)“, razítko etapy. Uložení do Kroniky, **sdílení jako obrázek**.
- Na konci výpravy: velká pohlednice + celková mapa s daty u medailonů = „deník cesty“.

**I. Domovská obrazovka jako „tady jsem“**

Pořadí shora:

1. **Kde jsem** – malá živá mapa (statická ikona MapLibre / náhled) s mou tečkou a nejbližšími medailony, ne jen nadpis.
2. **Uvítání / Cesta od minula** (E) – jen když je co ukázat; jinak dnešní řádek „Dnes zatím 2,4 km“.
3. **Další cíl** s metry a kroky, teaserem a pruhem „ze 3,2 km zbývá 0,4 km“ (pruh mezi minulou a další zastávkou je hmatatelnější než pruh celé trasy).
4. **Na dalších 5 km** – zamčená místa s teaserem a ikonou zámku, odemčená by se tu neměla objevit.
5. **Nedávno objeveno** – posledních pár míst s datem (vstup do příběhového prohlížeče).

Odkazy „Délka kroku“ a „Zdroje a licence“ přesunout do nastavení (ikona ozubeného kola), hlavička je dnes přeplněná.

**J. Mikro-interakce**

- Odemčení místa v reálném čase (aplikace otevřená, data přijdou): medailon „pečeť“ animace + jemná haptika, karta „Právě jste došli k …“.
- Lehká haptika při dokončení etapy, žádné zvuky ve výchozím stavu.
- Kreslení ušlé trasy na mapě animací od minulé pozice při otevření záložky Výprava.

### 4.3 P2 – Živost mimo aplikaci

**K. Aktualizace na pozadí (s ohledem na baterii)**

| Platforma | Mechanismus | Frekvence | Poznámka |
|---|---|---|---|
| Android | `expo-background-task` (WorkManager) + oprávnění `READ_HEALTH_DATA_IN_BACKGROUND` | 1× za 30–60 min, systém sám slučuje a respektuje úsporný režim | Funkce nemusí být na zařízení k dispozici – zkontrolovat `FEATURE_READ_HEALTH_DATA_IN_BACKGROUND`, jinak jen popředí. Oprávnění vyžádat až s upozorněními (L), ne při startu. |
| iOS | HealthKit **background delivery** (`HKObserverQuery`, frekvence hourly) + BGAppRefresh | systém budí při nových datech | Vyžaduje entitlement background delivery; dnes je v `app.json` `background: false`. |

Úloha na pozadí dělá jen: přečte součet od posledního čtení, spočte nové události (`journeyEvents`), uloží je, případně aktualizuje widget a pošle lokální upozornění. Žádná poloha, žádný GPS, žádná síť. Spotřeba je zanedbatelná.

**L. Upozornění (návrh plánu, implementace později)**

Principy ze spec (10): jen na události, jen po výslovném souhlasu, nabídnout až po první dokončené etapě (9.4), výchozí stav vypnuto. Upozornění jsou **lokální** (počítaná na zařízení z úlohy na pozadí), ne serverový push – nepotřebujeme účet ani server a zdravotní data neopouštějí telefon.

Typy (každý zvlášť zapínatelný):

| Typ | Příklad | Strop |
|---|---|---|
| Dosažená zastávka | „Došli jste k Trojskému zámku. Víte, proč má schodiště plné obrů?“ | max 1 denně (sloučit: „Došli jste k Trojskému zámku a 2 dalším místům“) |
| Dokončená etapa | „Etapa 1 je za vámi. Pohlednice z Prahy na vás čeká.“ | při události |
| Blízko cíle | „Do Mělníka vám zbývá 1,2 km.“ | jednou za výpravu |
| Týdenní shrnutí | neděle 18:00: „Tento týden 31 km, 9 nových míst.“ | 1× týdně |
| Návrat po pauze | **ne** „chybíte nám“; jen pokud mezitím přibyl postup: „Mezitím jste došli až k Roztokům.“ | max 1 za 7 dní |

Pravidla: tiché hodiny 21–8, nikdy upozornění, které připomíná nečinnost nebo vyčítá, žádné odznaky na ikoně s čísly.

Technicky: `expo-notifications` (lokální plánování), Android 13+ oprávnění `POST_NOTIFICATIONS` až v okamžiku, kdy uživatel upozornění zapne; kanály podle typu.

**M. Widget a trvalá informace**

- **Widget na plochu** (Android `react-native-android-widget` / iOS WidgetKit přes config plugin): „Vltavská stezka · 12,5 / 62 km · Trojský zámek za 40 m“ s miniaturou medailonu. Aktualizuje ho úloha na pozadí (K). Pro aplikaci bez tlaku je widget lepší než notifikace – informuje, ale nevyrušuje.
- Později iOS Live Activity / Android probíhající upozornění „na procházce“ – jen jako volitelná věc, nevýchozí.

### 4.4 P3 – Později

- **Životní cesta** a karta života na Domů (spec 9.1) – první „wow“ po instalaci zatím úplně chybí.
- **Pas s razítky**: každé místo = razítko v pasu výpravy, kompletní pas = pohlednice.
- **„Pohled z místa“**: větší fotka/panoráma u zastávek (vlastní nebo Commons; Street View licenčně nepoužitelné).
- **Roční přehled** v prosinci (spec 10).
- Druhá výprava a záložka **Objevovat** (dnes prázdná stránka „Knihovna výprav se připravuje“ – do té doby ji raději skrýt nebo ukázat jednu „připravujeme“ výpravu s náhledem mapy).

---

## 5. Pořadí prací

| Krok | Obsah | Velikost | Výsledek pro uživatele |
|---|---|---|---|
| 1 | P0 A + B (metry/kroky, světlé téma) | malý | Žádná „0,0 km“, aplikace vypadá jako pergamen. |
| 2 | P0 D (obnova v popředí, každých 60 s, stáhnout dolů, „aktualizováno před…“) | malý | Otevřená aplikace žije. |
| 3 | G – háčky a teasery pro všech 38 míst + pole v datech (`hook`, `teaser`, `context`) + detail místa podle nové šablony | střední (hlavně obsah) | Odemčení něco dá. |
| 4 | E + F (cesta od minula, příběhový prohlížeč) | střední | Návrat po chůzi je zážitek. |
| 5 | C (pěší trasa, etapy, hustota, testy) | střední | Mapa nevede vodou. |
| 6 | I + J (nová Domů, mikro-interakce, odemčení naživo) | střední | Domů = „tady jsem“. |
| 7 | H (pohlednice etapy, sdílení obrázku) | střední | Milník, který stojí za sdílení. |
| 8 | K + M (pozadí, widget) | velký, nativní | Postup vidím, aniž otevřu aplikaci. |
| 9 | L (lokální upozornění s nastavením) | střední | Volitelná zpráva o události. |

Kroky 1–2 jsou na den práce a lze je vydat jako 1.4.1. Kroky 3–4 jsou tím, co z aplikace udělá „tu nejlepší chodící aplikaci“; doporučuji je dělat společně (prohlížeč bez obsahu nemá smysl).

### Jak poznáme, že to funguje

- Po otevření s nově odemčenými místy uživatel otevře aspoň jedno z nich (cíl > 60 %).
- Návrat den 3 a 7 (spec 14).
- Při vlastním testu: „Co jsi se dnes dozvěděl?“ – uživatel umí odpovědět jedním faktem.

---

## 6. K rozhodnutí

1. **Trasa:** pěší trasa ~70–80 km s 5 etapami (doporučeno), nebo zachovat 62 km a jen ji kreslit u břehu?
2. **Tmavý režim:** ponechat jako volbu v nastavení (doporučeno), nebo úplně odstranit?
3. **Kroky vs. metry:** u krátkých vzdáleností ukazovat oboje (doporučeno), nebo jen kroky?
4. **Obsah:** kdo píše a ověřuje háčky – vlastní redakce, nebo návrh od Claude + ruční ověření dvěma zdroji (rychlejší, ale ověření je nutné vždy)?
5. **Pozadí a upozornění:** zařadit widget (M) před upozornění (L)? Doporučuji ano – menší zásah do soukromí i pozornosti.
