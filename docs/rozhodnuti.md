# Rozhodnutí

Záznam důležitých rozhodnutí. Nové přidávat dole, staré neměnit (jen označit jako nahrazené).

## 0001 Mapy: vlastní OSM, Mapy.com jako přepínač
Datum: 30. 10. 2026 · Stav: přijato

- **Výchozí podklad** jsou vlastní vektorové dlaždice z dat OpenStreetMap (PMTiles na Cloudflare R2) zobrazené v MapLibre s vlastním stylem (pergamen, den a noc).
- **Mapy.com** zůstává jako volitelný druhý podklad v nastavení pro ty, kdo chtějí podrobnější turistickou mapu. Dlaždice se berou přes `apps/api` (klíč jen na serveru).
- Důvod: pergamenový vzhled z mockupů nejde z rastrových dlaždic vyrobit, kontrola nad stylem a legální offline mapy.
- Důsledky: je nutné vyrobit a hostovat data (výřez Česka nebo koridory výprav) a napsat mapový styl. Podmínky Mapy.com (limity, atribuce, cachování) se ověřují až před zapnutím přepínače.
- Otevřené: velikost dat, náklady R2, aktualizace dat.

## 0002 Druhý vizuální styl je odložen
Datum: 30. 10. 2026 · Stav: odloženo, po MVP

- MVP má **jeden** vizuální styl: světlý a tmavý pergamen (`docs/mockupy`).
- Později vznikne **druhý styl** jako volba v nastavení (moderní, neutrální vzhled), pravděpodobně spojený s podkladem Mapy.com. Návrh stylu a obrazovek zatím neexistuje.
- Aby to šlo bez přepisování: barvy, písma a mapový styl držet v tématu (tokeny), ne natvrdo v obrazovkách; obrazovky nesmí předpokládat pergamenovou texturu.

## 0003 Pilotní výprava je „vlastní virtuální trasa“
Datum: 30. 10. 2026 · Stav: přijato

- Geometrie Vltavské stezky je **tok řeky** z dat OSM, ne vyznačená pěší stezka, proto má typ `virtual` (štítek „Vlastní virtuální trasa“), ne „Skutečná trasa“. Mockupy označují trasu jako skutečnou a mají se opravit.
- Obsah míst je zatím `draft` (nemá zdroje ani ověřená fakta) a výpravu nelze vydat, dokud všechna místa neprojdou šablonou zastávky (spec 7.3).

## 0004 Výprava se počítá od přesného okamžiku
Datum: 30. 10. 2026 · Stav: přijato

- Stav výpravy ukládá **časové značky** zahájení, pozastavení a obnovení (okamžiky ISO 8601), ne jen data dnů. Dřív se den zahájení počítal celý a den pozastavení vůbec, takže po pozastavení zmizel pohyb z toho dne (na telefonu Domů ukázalo 0,0 km místo 72 m).
- Výpočet je v `packages/core/src/periods.ts`: období se rozdělí na úseky po lokálních dnech; celé dny se berou z denních součtů, části dne (den zahájení, pozastavení, obnovení) z volitelného `HealthSource.readInterval`.
- Zdroj bez čtení intervalu (zatím iOS) započítá části dne celým dnem, každý den jednou: nic se neztratí, ale může se započítat i pohyb ze stejného dne před zahájením nebo po pozastavení.
- Starý uložený stav po dnech se při načtení převede na lokální půlnoci a počítá stejně jako dřív.
- Vzdálenost se po každém otevření a po pozastavení znovu dopočítá ze zdravotních dat, neukládá se. Pozdě synchronizovaná data (hodinky) se tak do správného období doplní.

## 0005 Android: kroky jako hlavní zdroj vzdálenosti
Datum: 30. 10. 2026 · Stav: přijato, přehodnotit s daty z hodinek

- Na Androidu se vzdálenost počítá z kroků; agregovaná `Distance` z Health Connectu se použije, jen když je mezi 50 % a 200 % odhadu z kroků. Den bez kroků se nepočítá.
- Důvod: na reálném telefonu byla `Distance` jen za jeden den a i ta neúplná, kdežto kroky za šest týdnů; `Distance` navíc zahrnuje kolo.
- iOS se nemění (čte `DistanceWalkingRunning`, vzdálenost má přednost).
- Podrobnosti a co zbývá ověřit: `docs/technologie.md`, Známá omezení.

## 0006 Osobní délka kroku
Datum: 30. 10. 2026 · Stav: přijato

- Na Androidu (a u iOS při chybějící vzdálenosti) je vzdálenost kroky × délka kroku, takže přesnost celé aplikace stojí na této jedné hodnotě. Pevných 0,75 m je průměr, u vysokého nebo malého člověka chyba v řádu 10 % i víc.
- Délka kroku se určuje ve třech úrovních (`packages/core/src/steplength.ts`): **kalibrace nebo ruční hodnota** > **odhad z výšky** (0,415 pro muže, 0,413 pro ženy, 0,414 neuvedeno; vzorec běžný u krokoměrů, Fitbit, Garmin a další) > **obecný průměr 0,75 m**. Aplikace vždy ukazuje, odkud hodnota je.
- Kalibrace: uživatel zadá délku trasy, kterou ušel (např. změřenou v mapě), aplikace přečte kroky za dobu měření ze zdravotních dat a vypočítá délku kroku. Odmítne méně než 300 kroků a výsledek mimo 30–150 cm. Garmin dělá totéž.
- Okno důvěry vůči `Distance` (rozhodnutí 0005) se odvozuje od odhadu z kroků, takže se s osobní délkou kroku posouvá samo.
- Výška, pohlaví a délka kroku se ukládají jen v telefonu (AsyncStorage). Po změně se vzdálenost výpravy přepočítá, neukládá se (rozhodnutí 0004).
- Zatím neřešeno: kalibrace na iOS (`readSteps` chybí v `ios.ts`; iOS ale zapisuje vlastní `walkingStepLength`, vhodný jako výchozí hodnota), automatické učení z dat (až po kronice v SQLite), délka kroku při běhu je delší než při chůzi.
- NEOVĚŘENO na telefonu: přesnost kalibrace na krátkém úseku. Health Connect zapisuje kroky v záznamech po desítkách minut a při čtení je dělí poměrně podle času, takže na krátkém měření může být chyba. Proto se doporučuje aspoň 400 m a rozumný odmítací limit.

## 0007 Kronika se ukládá do SQLite
Datum: 30. 10. 2026 · Stav: přijato, první část hotová

- Zdravotní data se čtou do lokální databáze `footatlas.db` (`expo-sqlite`, `apps/mobile/src/db`), ukládají se **surové** kroky a vzdálenost po dnech a zdrojích, vedle nich vybraná hodnota podle pravidla z core (`packages/core/src/chronicle.ts`, verze pravidla `RULE_VERSION`) a délka kroku, se kterou se spočítala.
- Po změně délky kroku nebo pravidla se dny přepočítají z uložených surových hodnot, bez nového čtení zdravotních dat. Dny, které zdroj přestal vracet, se nemažou.
- Čtení se spouští jen na výzvu uživatele (tlačítko „Načíst historii“, spec 9.1) a potom automaticky při otevření aplikace, posledních 7 dní kvůli pozdě synchronizovaným datům.
- Stav rozjeté výpravy je také v SQLite (`expedition_run`, `expedition_period`, migrace verze 2); core se nemění, `ExpeditionSession` se jen ukládá a načítá (`apps/mobile/src/db/expeditionStore.ts`). Souběžně může běžet jedna výprava (unikátní index nad stavem). Zápisy do databáze běží po jednom (`db/lock.ts`), aby se souběžná synchronizace kroniky a uložení výpravy nezablokovaly.
- Starý stav z AsyncStorage se při prvním načtení převede, starý klíč se smaže až po ověření čtením zpět; stav v databázi má vždy přednost. Ověřeno na telefonu: databáze po aktualizaci měla verzi 2 a běžící výprava (od zahájení z dřívějška, 1 005 m „viděno“) se přenesla beze změny.
- Zatím neukládáno: dokončené a opuštěné výpravy, události (`expedition_event`), milníky životní cesty.
- Na webu se databáze nepoužívá (prázdná kronika pro náhled obrazovek).
- Testy: `packages/core/src/chronicle.test.ts` (pravidla) a `apps/mobile/src/db/db.test.ts` (migrace, zápis a přepočet nad `node:sqlite`).
- Ověřeno na telefonu: první import 61 dní za pár sekund (332 km = 443 656 kroků × 0,75 m, shoduje se s diagnostikou), po restartu aplikace jsou data v databázi. NEOVĚŘENO: rychlost importu s historií za roky, chování při přerušení importu.

## 0008 iOS: čtení intervalu a kroků pro kalibraci
Datum: 30. 10. 2026 · Stav: přijato, NEOVĚŘENO na iPhonu

- iOS teď umí `readInterval` (výprava od okamžiku zahájení a pozastavení, rozhodnutí 0004) i `readSteps` (kalibrace délky kroku, rozhodnutí 0006), takže den zahájení a pozastavení se na iOS nepočítá celý.
- Implementace (`apps/mobile/src/health/ios.ts`, `intervalSum`) používá kolekci statistik s **jediným kbelíkem**, který končí přesně v `to`; HealthKit dělí vzorky na hranicích kbelíků sám. Interval kolekce je jen v celých minutách, takže kbelík začíná nejvýš o minutu před `from`; filtr omezí vzorky na ty od `from`. Chyba je tedy nejvýš minuta pohybu na straně `from`. Důvod, proč ne `queryStatisticsForQuantity` s rozsahem: nevíme, zda u vzorku přesahujícího hranici rozsahu započítá jen část, nebo celý (na Androidu jsme to museli změřit, viz Známá omezení).
- Pravidlo na iOS zůstává „vzdálenost má přednost“ (`toDailyRecord`), délka kroku se použije jen při chybějící vzdálenosti.
- Ověřeno: typecheck a export JS balíčku pro iOS (`expo export --platform ios`). **Neověřeno:** chování na zařízení. Postup ověření: na iPhonu v dev panelu porovnat součet `readInterval` za dnešek od 00:00 s denním součtem v aplikaci Zdraví, a interval přes hranici vzorku (např. 10:55–11:05) s poměrným očekáváním.
- Zatím neřešeno: výchozí délka kroku z `HKQuantityTypeIdentifierWalkingStepLength` (vyžaduje další oprávnění ke čtení a nové dotazy v `ios.ts`).

## 0009 Release APK mimo Google Play, lokální build, vlastní klíč
Datum: 30. 10. 2026 · Stav: přijato

- Pro vlastní a zkušební použití stačí podepsané APK, Google Play se nepoužívá. Build běží lokálně přes Gradle (`tools/release-apk.sh`), ne přes EAS: bez účtu a fronty, bezplatný tarif EAS má omezený počet buildů.
- Podpis vlastním klíčem mimo repozitář; plugin `withReleaseSigning` nikdy nepoužije veřejný debug klíč ze šablony. Jen `arm64-v8a`.
- Dosavadní vývojový build byl podepsaný debug klíčem, přechod na release klíč proto vyžadoval jednu odinstalaci (smazaná lokální data; kronika se načetla znovu z Health Connectu).
- Backend se v této fázi nepoužívá; obsah je v APK. Mapa je otevřená věc: koridor 26 MB přibalit do APK a při prvním spuštění zkopírovat do úložiště aplikace (`pmtiles://` čte jen soubory v `files/`), nebo stahovat z hostingu.
- Postup a stav ověření: `docs/release-apk.md`.

## 0010 Mapa v aplikaci: MapLibre nad přibaleným koridorem
Datum: 30. 10. 2026 · Stav: přijato, ověřeno na emulátoru Android 16 (vývojový i release build); část o přibalení dlaždic do APK nahrazena rozhodnutím 0013 (stahování z R2)

- `ExpeditionMap` kreslí MapLibre Native: vlastní OSM dlaždice z koridoru Vltavské stezky (PMTiles, 26 MB), pergamenový styl z `packages/map-style`, trasa (ušlá plná, zbývající čárkovaná), zastávky, malé objevy a poloha jako vrstvy GeoJSON. Klepnutí na místo otevře zastávku. Popisky zastávek rozmísťuje MapLibre (kolize), ruční rozmisťování ze SVG náhledu odpadlo.
- **Úvodní pohled** je kolem polohy a další zastávky (jako v mockupu), ne celá trasa; tlačítko „Celá trasa“ / „Moje poloha“ přepíná. Mapa podle motivu přepíná den a noc.
- **Data jsou v APK.** Metro přibalí `assets/map/vltava-koridor5.pmtiles` a písma (Noto Sans Regular a Italic, rozsahy pro češtinu); při prvním spuštění se zkopírují do úložiště aplikace (`src/map/mapAssets.ts`), protože MapLibre čte `pmtiles://` jen ze souboru. Kopie nese otisk souboru v názvu, dokončená se pozná podle značky `.ok`. Backend se nepoužívá.
- Velký soubor PMTiles není v gitu; `tools/maps/copy-to-app.sh` ho zkopíruje z `tools/maps/out/` (viz `docs/mapy-osm.md`), `tools/release-apk.sh` to dělá sám.
- Záloha: web a selhání přípravy dat ukážou dosavadní náhled trasy (`RouteSketch`). Atribuce „© přispěvatelé OpenStreetMap“ je vidět přímo na mapě.
- Silnice 1. až 3. třídy se ve stylu zobrazují od zoomu 9,5 (v přehledu celé trasy je jinak mapa nepřehledná).
- Zbývá: iOS (knihovna má u `pmtiles://` na iOS otevřený problém), ověření na reálném telefonu a na slabších zařízeních, medailony s fotkami a pečeti ze mockupů, další výpravy (data pro další koridory, stahování).

## 0011 Medailony zastávek a atribuce obrázků
Datum: 30. 10. 2026 · Stav: přijato, ověřeno na emulátoru Android 16 (vývojový i release build, světlý i tmavý režim)

- Zastávky na mapě jsou **medailony** podle mockupu: fotka v kruhovém ořezu s kroužkem, u dosažených odznak „došlo se“, další zastávka má tlustší kroužek, zamčené jsou šedé. Zastávka bez fotky má kruh s ikonou věže. Malé objevy jsou tečky (dosažené plné, ostatní prázdné).
- Medailony jsou hotové obrázky (`apps/mobile/assets/map/medallions`, @3x, pro den a noc) vyrobené skriptem `tools/maps/make-medallions.py` z fotek v `docs/mockupy/assets`; vykresluje je MapLibre jako symbolovou vrstvu. Důvod proti nativním pohledům: stabilní vykreslení, popisky a ikony se rozmisťují společně (kolize) a ikony se zvětšují s přiblížením (v přehledu celé trasy jsou malé).
- Fotky jsou z Wikimedia Commons (CC BY-SA a jiné) a platí pro ně povinná atribuce. Obrazovka **Zdroje a licence** (odkaz dole na Domů) je vypisuje spolu s daty OSM a písmy; zdroj pravdy je `src/data/credits.ts` a `docs/mockupy/assets/ZDROJE.md`. **Před vydáním ověřit autora a licenci u každého souboru** (u Trojského zámku autor v metadatech chybí) a nahradit fotky z mockupů ověřenými podle šablony zastávky (spec 7.3).
- Metro pozná `@3x` variantu sám, v `require` se přípona škálování neuvádí.

## 0012 Dny dosažení míst se ukládají
Datum: 31. 10. 2026 · Stav: přijato, ověřeno na emulátoru (ukázkový postup); reálná data zatím ne

- Dosažená místa, dokončené etapy a cíl výpravy se ukládají do tabulky `expedition_event` (migrace verze 3) **s dnem, kdy je výprava dosáhla**, ne s dnem, kdy to aplikace zjistila při otevření. Den počítá čistá funkce `journeyEvents` (`packages/core/src/journey.ts`) z vzdáleností po úsecích výpravy (`walkedBySlice`): první úsek, ve kterém kumulativní součet dosáhl kilometru místa.
- Zapsané události se nepřepisují (`INSERT OR IGNORE`): den prvního dosažení zůstane, i když se později změní data (pozdní synchronizace hodinek) nebo délka kroku. Smazání výpravy smaže i její události.
- Kronika ukazuje sekci Výprava: dokončené etapy, odemčená místa s datem (posledních pět, ostatní na tlačítko). V ukázkovém postupu se události dopočítají na místě a neukládají se.
- Neřeší se: dokončená výprava jako samostatný záznam (stav `completed`), znovu spuštěná výprava, historie dřívějších výprav v Kronice.

## 0013 Mapa se stahuje z Cloudflare R2, ne z APK ani z gitu
Datum: 31. 10. 2026 · Stav: přijato, nasazeno; stahování ověřeno proti produkci na emulátoru Android 16 (release build)

- Koridor Vltavské stezky (26 MB PMTiles) **není v gitu ani v APK**. Leží v R2 bucketu `footatlas-content` pod `maps/<název>-<12 znaků SHA-256>.pmtiles` a aplikace ho při prvním spuštění stáhne do úložiště (`src/map/mapAssets.ts`), ověří velikost a použije jako `pmtiles://file://…`. Název s otiskem obsahu znamená, že se soubor nemění a smí se kešovat navždy; nová verze dat = nový název, nová verze aplikace (`src/map/mapSource.ts` generuje `tools/maps/publish.sh`).
- Doručuje ho Worker `apps/api` (`GET /content/<klíč>`, HEAD, `Range`, `ETag`, `Cache-Control: immutable` pro `maps/`). Bucket zůstává soukromý, veřejný je jen Worker. Adresa serveru je v `app.json` v `extra.apiBaseUrl`.
- Důvod: velké binárky nepatří do gitu (každá verze zůstane v historii navždy) a ani do APK (při více výpravách by rostlo); R2 nemá poplatky za odchozí data a Worker dává kontrolu nad kešováním.
- První spuštění potřebuje připojení (26 MB); do té doby a při selhání se ukazuje náhled trasy se zprávou a tlačítkem „Zkusit znovu“. Písma map (0,6 MB) zůstávají v APK.
- **Stav 31. 10. 2026:** Worker `footatlas-api` je nasazený na `https://footatlas-api.ecerpavel.workers.dev` (vazba `CONTENT` → `footatlas-content`), adresa je v `app.json` (`extra.apiBaseUrl`). Ověřeno: `/health`, HEAD, `Range`, 404 pro chybějící klíč i pokus o průchod cestou, SHA-256 staženého souboru shodný s originálem; release APK 1.3.1 (5) po `pm clear` stáhl mapu z produkce a vykreslil ji. Neověřeno: reálný telefon a iOS, vlastní doména místo `workers.dev`.

## 0014 Světlý vzhled výchozí, vzdálenosti lidsky, Nastavení
Datum: 2. 11. 2026 · Stav: přijato, ověřeno testy a typecheckem; na telefonu NEOVĚŘENO

- Výchozí vzhled je světlý pergamen pro všechny (`app.json` `userInterfaceStyle: "light"`); volba Světlý / Tmavý / Podle systému se ukládá v AsyncStorage (`ThemeProvider`, `storage.ts`).
- Zbývající vzdálenost k místu: `formatDistance` (`apps/mobile/src/format.ts`): pod 15 m „Jste tady“, pod 1 km metry po 10 m a „asi N kroků“ z osobní délky kroku, do 10 km na desetiny, dál celé km. „0,0 km“ se už nezobrazí.
- Nová obrazovka `/nastaveni` (vzhled, délka kroku, zdroje a licence, vývoj jen v `__DEV__`), na Domů ji otevírá ozubené kolo.
- Splash screen se skryje až po načtení uložené volby vzhledu, takže tmavá volba už nebliká světlým (ověřeno testy a na emulátoru ve světlém; tmavý vzhled na emulátoru neviděn).

## 0015 Živá obnova v popředí
Datum: 2. 11. 2026 · Stav: přijato, ověřeno testy; chování na zařízení NEOVĚŘENO

- Vzdálenost výpravy se čte znovu při návratu aplikace do popředí (nejdřív 15 s po posledním čtení), každou minutu, dokud je aplikace aktivní a výprava běží, a stažením prstem na Domů. Na pozadí se nečte nic. Čtení se nepřekrývají; změny výpravy (start, pauza, délka kroku) se při běžícím čtení zařadí za něj (`ExpeditionProvider`, `refreshPolicy.ts`).
- Kolečko obnovy jen při stažení prstem, automatická čtení běží potichu. Domů ukazuje „Aktualizováno před N min“ a po 2 minutách vysvětlení, že zdroj zapisuje kroky s prodlevou.

## 0016 Příběhy míst odděleně od geometrie
Datum: 2. 11. 2026 · Stav: přijato; texty NEOVĚŘENÉ (`verified: false`)

- Obsah míst (háček, upoutávka, hádanka se třemi možnostmi, kontext, tip „Až tam půjdete“, kapitola, zdroje) je v `packages/content/data/vltavska-stezka/obsah.json` se schématem `story.ts`; `expedition.json` nese jen polohy a vzdálenosti. Důvod: text a trasa se mění nezávisle.
- Hotovo 14 míst 1. etapy a 5 kapitol. Detail místa: odemčené ukáže háček, kontext, tip, den dosažení a postup kapitoly; zamčené upoutávku, hádanku a vzdálenost. Karta „Koncept obsahu“ zmizela; neověřenost se eviduje v datech, ne v UI.
- Před vydáním: ověřit vše dle `docs/obsah-vltavska-podklady.md` (úkoly k ověření), doplnit zbývající etapy.

## 0017 Pěší trasa po souši
Datum: 2. 11. 2026 · Stav: přijato; v terénu NEOVĚŘENO

- Trasa Vltavské stezky už nevede středem řeky: pěší routing OSRM nad OpenStreetMap (ODbL) přes vybrané body na břehu, zjednodušeno (`tools/route/build-walking-route.mjs`, `DRY=1` jen report). 62,25 km, 4 etapy končící v Roztokách, Kralupech, Vraňanech a v Mělníku (16,7 / 17,0 / 17,8 / 10,8 km).
- Místa na druhém břehu se nenavštěvují, jen promítají („výhled přes řeku“); 9 míst je dál než 500 m od trasy (nejvíc Klecany 3 km).
- Trasa se od staré čáry vzdálí nejvýš 1,5 km, mapový koridor stačí.
- Rizika: přívozy (Podbaba, Libčice, Lužec) jezdí sezónně; úsek Červený mlýn → Vraňany je nejvíc zakřivený (1,8× vzdušné vzdálenosti), projít na mapě. Hustota: jediná mezera nad 4 km (Výhled na Říp → Vepřek, 4,4 km), doplnit objev.

## 0018 Hádanky s tipem, příběhy objevů a Domů podle mockupu
Datum: 2. 11. 2026 · Stav: přijato; ověřeno testy a na emulátoru Android 16 (release APK, ukázkový postup), na telefonu NEOVĚŘENO

- **Tipy k hádankám (M3).** U zamčeného místa tři možnosti; tip je dobrovolný, bez bodů, lze ho měnit do odemčení a ukládá se jen v telefonu (`footatlas.tips.v1`). Po odemčení detail řekne „Tipovali jste správně“ nebo „Tohle překvapí“ a ukáže správnou odpověď. Logika v `src/riddle.ts` (+test).
- **Příběhy objevů (M2).** Karta „Od posledně“ má tlačítko „Projít je (N)“ s listováním nově odemčenými místy (háček, kontext, den dosažení, kapitola), na konci hádanka dalšího místa. Místa se předávají parametrem `ids`, protože „od posledně“ se po odchodu z Domů maže. Bez fotografie (fotky míst v aplikaci zatím nejsou).
- **Domů.** Přibyly: hádanka další zastávky s tlačítkem „Tipnout“, „Kam dnes dojdu?“ (1, 2, 4 km, konec etapy; jen ukáže, co by se odemklo, nic nenastavuje), „Nedávno objeveno“, Kapitoly s postupem.
- **Objevovat** ukazuje rozjetou výpravu a kartu „Připravujeme“ s poznámkou „Chci vědět, až bude“ (jen lokálně, nic se neodesílá; název další výpravy se nevymýšlí). **Kronika** má deník po dnech místo seznamu míst.
- Nezahrnuto: návrat „Inkoust“ s letem kamery (M1), příchod naživo (M4), styl mapy skica/inkoust, zeměkoule v Kronice, Karta života, pohlednice.

## 0019 Balík A: základ vzhledu „Inkoust“, Domů a detail zastávky
Datum: 2. 11. 2026 · Stav: přijato; ověřeno testy a webovým exportem v Chromiu (světlý i noční vzhled), na zařízení NEOVĚŘENO

- **Tokeny.** Noční vzhled podle nočních snímků a `mockupy/noc.css` (papír `#221C16`, karta `#2E261E`, akcent `#E0704A`, popisky zlatě). Přibyly `surfaceAlt`, `chip`, `chipActive(Fg)`, `inkCard(Fg)`, `fgSoft`, `mutedStrong`; stávající klíče zůstaly.
- **Komponenty** (`src/components/`): `ScreenHeader`, `StatTile`, `Chip`, `Medallion`, `Seal` (pečeť, razítko, zamčený kroužek, kapitola, etapa) a `SealBadge`, `LabeledCard`, `PlaceHero`. Nepravidelný okraj vosku a razítka je vykreslený tvarem (`src/seal.ts`), ne filtrem SVG, protože react-native-svg na telefonu `feTurbulence` nezná. Dopad 600 ms s přestřelem, kruh 700 ms; při „Omezit pohyb“ jen prolnutí 400 ms. **Haptika chybí**: `expo-haptics` v projektu není a nový nativní modul vyžaduje nový build.
- **Domů** podle `08-domu.jpg`. Dlaždice berou data výpravy (`daily` v `ExpeditionProvider`); nemají-li data, vynechají se. „Pohlednice“ ukazuje zbývající vzdálenost do konce etapy. Odhad času počítá s 5 km/h (shodné s prototypem). Hlášky pod „Kam dnes dojdu?“ jsou z prototypu; bez shody žádná. Název etapy „Praha“ je z prototypu, ostatní etapy se jmenují podle cíle.
- **Detail zastávky** podle `06-zastavka.jpg` a `03-hadanka.jpg`. Fotky 9 míst jsou v `assets/places/` (licence v `credits.ts`, přibyl Karlův most; neznámý autor se v UI nevypisuje). Místa bez fotky mají nižší šrafovaný pruh. „Poslat jako pohlednici“ je skryté do balíku D. Vazby tvaru „Od Trojské lávky“ vyžadují skloňování, proto „Předtím: …“ a „Cestou sem“.
- Zbývá: skutečné příběhy a fotky pro etapy 2–4 (balík E), počty míst v kapitolách jsou zatím jen z míst, která příběh mají.

## 0020 Mapa jako ilustrovaný atlas (balík B)
Datum: 2. 11. 2026 · Stav: přijato; styl ověřen v MapLibre GL JS (Chromium) nad daty OSM, nativní vykreslení na Androidu a Výprava na zařízení NEOVĚŘENO

- **Styl `buildAtlasStyle` (`packages/map-style/src/atlas.ts`)** nahrazuje obarvený OSM (starý `buildStyle` zůstává pro nástroje). Tři vrstvy nad stejnými dlaždicemi: kolorovaná (okrové bloky se vzorem čtverečků, zelené lesy se vzorem stromů, vinice, akvarelová řeka), **krycí** a **skica** (tužkové šrafování, linky, bez výplní) nad ní. Popisky jsou kurzívou IM Fell, řeka „Vltava“ podél toku. Palety den a noc jsou tokeny `atlas` v `tokens.ts`.
- **Maska místo ořezu.** MapLibre nemá ořezovou masku, proto je kolorovaná vrstva všude dospod a krycí vrstva v barvě papíru ji skryje mimo okolí ušlé části trasy: papír s dírou = sjednocení „kapslí“ kolem zjednodušené trasy (`revealMask`, `polygon-clipping`; poloměry 380 a 650 m, dvě vrstvy pro měkký okraj). Aplikace ji dodává jako dva zdroje GeoJSON a vkládá `beforeId` před skicu. Důsledek: skica je vidět i ve vybarvené části (její vzor leží přesně na barevném), což je záměr.
- **Vzory výplní** jsou hotové dlaždice PNG @3x (`tools/maps/make-patterns.py`, `fill-pattern`); oproti prototypu se vzor neotáčí (MapLibre vzor natočit neumí) a řeka nemá šumový filtr `wc`: nepravidelný okraj je přiblížen rozpitím (`line-blur`) a čárkovanou linkou.
- **Glyfy IM Fell English Italic** se musely vyrobit (`tools/maps/make-glyphs.py`): přibalené glyfy byly jen Noto Sans. Popisky používají **jediné písmo** (ne „IM Fell, Noto“), protože MapLibre by žádal soubor pod názvem „A,B“ a aplikace má glyfy po písmech.
- **Pečeti podle `02-peceti.jpg`** (`make-medallions.py`, obrázky symbolových vrstev): dosažená zastávka = vosková pečeť s fotkou, další = šedý medailon s čárkovaným kroužkem a štítkem metrů (text + roztažená pilulka, protože se metry mění), zamčená = šrafovaný kroužek s otazníkem, malý objev dosažený = inkoustové razítko, zamčený = tečkovaný kroužek. Velikost ikon roste se zoomem (přehled / trasa / detail). Stav místa a obrázek počítá `src/map/atlasPlaces.ts` (+test).
- **Ilustrované prvky:** rámeček „List I“ s měřítkem je vrstva React Native nad mapou (`AtlasFrame`, měřítko podle zoomu), protože je pevný vůči obrazovce, ne vůči mapě. Kresby památek (loď u přívozu, zámek, most) jsou obrázky v symbolové vrstvě, aby se hýbaly s mapou a nepotřebovaly synchronizaci pozic s kamerou; přiřazují se **jen podle názvu místa** („Přívoz …“, „zámek“, „most“, „lávka“), jde o zjednodušené kresby, ne o podobu konkrétních staveb. Kresby Hradčan a dalších památek z prototypu nejsou (v datech nejsou místa, ke kterým by patřily).
- **Výprava** (`(tabs)/vyprava.tsx`): mapa přes celou obrazovku, plovoucí karta (název, pruh etap, „List I · N razítek z M“ ze skutečných míst etapy), tlačítka „Moje poloha“ a „Celá trasa“ nad panelem, spodní panel s další zastávkou, hádankou a údaji jen ze skutečných dat: „Na dalších 5 km“ (`state.upcoming`), „Přívoz“ (nejbližší místo s názvem „Přívoz …“) a „Konec etapy“ (v prototypu „Pohlednice“, ale pohlednice zatím není). Název oblasti etapy („Praha“) v datech není, proto ho karta neuvádí.
- Nezahrnuto: tažení panelu (úchyt je jen vizuální), rámeček v obrazovce Výprava (podle snímku tam není; komponenta je připravená pro Návrat, balík D), kresby dalších památek, otáčení vzorů, tmavý vzhled vyladěný designérem (noční paleta je odvozená).
- Neověřeno: nativní vykreslení (`fill-pattern`, `icon-text-fit`, `beforeId` u vrstev ze zdrojů přidaných komponentami, výkon `revealMask` na telefonu a velikost obrázků při zoomu) na Androidu i iOS.

## 0021 Kronika, Objevovat a Karta života podle prototypu Inkoust (balík C)
Datum: 2. 11. 2026 · Stav: přijato; ověřeno testy čisté logiky a webovým exportem v Chromiu (světlý i tmavý vzhled, ukázková data), na zařízení NEOVĚŘENO

- **Poctivost čísel.** Vše z reálných dat (`useChronicle`, `expedition_event`, `obsah.json`); kde data chybí, dlaždice se nezobrazí nebo je klidný prázdný stav. Podíl cesty kolem Země z obvodu 40 075,017 km; kroky jsou odhad z délky kroku („asi“). Vzdálenosti měst se počítají haversinem z Prahy (vzdušnou čarou), ne z tabulky. Srovnání „pořád na východ“ z prototypu se **nepoužilo** (bez spolehlivé tabulky zemí na rovnoběžce by šlo o vymyšlené tvrzení); nahradila ho věta o vzdušné čáře z Prahy a srovnání nejdelšího dne s délkou výpravy.
- **Kronika.** Tmavá karta se zeměkoulí (klepnutí otevře Kartu života), střídavé věty, přepínač Deník / Cesta / Rok / Sbírky. **Deník**: dny výpravy s kilometry úseku, minimapou, odhadem kroků a čipy odemčených míst; postřeh z jednoduchých pravidel a šablon (`src/kronika/diary.ts`, priorita: cíl, etapa, počet míst, další místo u dneška, nejdelší den, délka). **Cesta**: města vzdušnou čarou z Prahy s dnem, kdy součet kroniky hranici překročil (jen z denních záznamů). **Rok**: mřížka den po dni, nejsilnější měsíc, dny v týdnu (od 14 dnů se záznamem), rekordy. **Sbírky**: listy atlasu (etapy), razítka míst, pečeti kapitol; pohlednice až s balíkem D.
- **Úseky po dnech.** `ExpeditionProvider` navíc vystavuje `daySlices` (už počítané `walkedBySlice`); z nich a z `expedition_event` vzniká deník. V ukázkovém postupu je vše „dnes“.
- **Objevovat.** Rozjetá výprava nahoře (náhled trasy z `route.json`), „Připravujeme“ s třemi koncepty z prototypu (`src/kronika/upcoming.ts`, `verified: false`, v UI bez poznámek; délky a popisy před vydáním ověřit), „Chci ji“ = poznámka v telefonu po výpravě (`footatlas.wishes.v1`, nahrazuje obecné `footatlas.wish.v1`), banner životní cesty jen s daty.
- **Karta života** (`/karta-zivota`): po prvním načtení historie z Kroniky (jednou, `footatlas.lifecard.v1`) a z klepnutí na kartu v Kronice. „Sdílet jako obrázek“ zatím není (skryto). Tmavá karta je v tmavém vzhledu krémová, jako v nočních snímcích; barvy z tokenů obou témat, ne z `noc.css`.
- Pečeť a zeměkoule jsou zatím lokální (`components/kronika/parts.tsx`); sloučení se sdílenou pečetí z balíku A zajistí PR.

## 0022 Okamžiky: návrat, příchod, pohlednice a přívoz (balík D)
Datum: 2. 11. 2026 · Stav: přijato; ověřeno testy čisté logiky a webovým exportem v Chromiu (světlý i tmavý vzhled, ukázkový postup), let kamery MapLibre a nativní vykreslení NEOVĚŘENO

- **Návrat „Inkoust“** (`/navrat?from&to`). Domů místo karty „Od posledně“ ukáže `ReturnCard` (velké číslo, úsek „A → B“, „Přehrát návrat“), když přibylo ≥ 300 m, místo nebo dokončená etapa. Úsek se předává parametry, protože Domů si `markSeen` volá při odchodu; tím se úsek nenabídne dvakrát. Čistá logika (kdy, doba letu 4–9 s, ease-in-out, klíčové body, rozestupy razítek ≥ 250 ms, nadpis „Od pátku jste ušli“, úsek) je v `src/navrat.ts` s testy. Kamera (`FlightMap`, nový soubor, protože `ExpeditionMap` je mimo tento balík) letí řetězem klíčových bodů `setStop`, pak `fitBounds`; místa se odemykají podle polohy letu, vybarvení maskou se přepočítává po šestinách úseku. Razítka dopadají v pásu nad spodním okrajem mapy (ne přímo na mapě), po skončení je převezme spodní panel „Cestou jste potkali“. Přeskočit: klepnutí na mapu nebo „Přeskočit“. „Omezit pohyb“: bez letu, jen prolnutí. Haptika není (chybí `expo-haptics`, nový nativní modul).
- **Příchod naživo** (`ArrivalHost` v `_layout.tsx`). Hlídá změnu `walkedM` v `ExpeditionProvider` (ten se nemění): jen v popředí, po návratu z pozadí se první čtení přijme potichu (to je věc návratu). Ukáže pečeť, „Právě jste došli“, název místa v 1. pádu (bez skloňování), háček, odpověď na hádanku a vyhodnocení tipu (`tipOutcome`). Bez zvuku, zavře se klepnutím a zapamatuje si postup (`markSeen`). Logika v `src/prichod.ts`.
- **Pohlednice z etapy** (`/pohlednice?stage[&place]`). Čísla (km, dny, místa) z dat výpravy: dny z `daySlices` (kumulace od startu), zastávky a objevy z míst etapy. Líc: fotka prvního místa etapy s fotkou, jinak náčrt etapy; rukopisný nadpis („Pozdrav z Prahy“ jen u 1. etapy, jak je v prototypu, jinak „Pozdrav z etapy II“); rub: razítka a věty složené z reálných míst a háčků. Otočení 400 ms 3D (při „Omezit pohyb“ prolnutí). Karta další etapy jen z dat (zastávky, délka, počet míst; první hádanka jen když ji místo má). „Uložit do Kroniky“ = poznámka v telefonu (`footatlas.postcards.v1`); dokončený list ve Sbírkách Kroniky vede na pohlednici. Otevírá se z návratu, z příchodu, z detailu místa („Poslat jako pohlednici“) a z Kroniky. **„Sdílet obrázek“ je skryté**: snímek obrazovky vyžaduje nativní modul (`react-native-view-shot`), nový build.
- **Přívoz jako scéna** (`/privoz?id`). Přívoz = místo s názvem „Přívoz …“ (jako kresba lodi na mapě). V datech jsou **dva** (Přívoz v Podbabě, Přívoz do Letek); Lužec nad Vltavou přívoz v datech nemá, proto dlaždice říká „1 ze 2 na trase“, ne „1 ze 3“. Ilustrace je SVG (řeka, přístaviště, loď přeplouvá 3,5 s, pečeť dopadne na druhém břehu). Texty jen z `obsah.json` (háček, kontext) nebo věta místa z `expedition.json`; „Další přívoz“ s odstupem z dat. Sezónnost ani linka P2 se neuvádějí (v podkladech u P2 značka 🟡, sezónnost jen v poznámkách k trase). Otevírá se z příchodu, návratu a detailu místa.
- Nezahrnuto / neověřeno: let kamery a `FlightMap` na zařízení (výkon `revealMask` po krocích, plynulost `setStop` s 12 klíčovými body), haptika, sdílení obrázku, skutečné nasazení `ArrivalHost` při živé obnově (ověřeno v ukázkovém postupu přes „+5 km“).

## 0023 Příběhy míst 2.–4. etapy (balík E)
Datum: 2. 11. 2026 · Stav: přijato; obsah **neověřený** (`verified: false`), testy zelené, na zařízení NEOVĚŘENO

- **Co přibylo.** 23 příběhů ve stejné šabloně jako 1. etapa (háček, upoutávka, hádanka s třemi možnostmi, kontext, tip, kapitola, zdroje) v `obsah.json`. Každý má aspoň jeden zdroj s URL, 15 z nich dva nebo víc (zdroje nejsou vždy nezávislé); texty jsou přeformulované. Kapitoly zůstaly stejné (použité: Počátky Čech, Šlechtická sídla, Mosty a lávky, Ostrovy, Voraři).
- **Místa (`expedition.json`).** Vepřek měl v prototypu polohu asi 3 km vedle; oprava podle Wikipedie (50,3108; 14,3231) zároveň zrušila mezeru 4,4 km před Vepřkem, takže nový „vycpávkový“ objev nebyl potřeba. „Lužní les“ nahradily Mlčechvosty, „Polabskou rovinu“ Lávka do Bukolu, přibylo Zdymadlo Hořín (39 míst: 10 zastávek, 29 objevů). Texty Libčic a Lobečku se opravily, protože tvrdily nedoložené věci (voroplavba; Lobeček na levém břehu, kde leží na pravém).
- **Testy.** `pilot.test.ts`: 39 míst, 29 objevů a `issues` je prázdné (mezera zmizela, výjimka odpadla). `story.test.ts`: každé místo má příběh kromě dvou záměrných, hádanka má tři různé možnosti, každý příběh aspoň jeden zdroj a `verified: false`.
- **Záměrně bez příběhu:** Slepé rameno, Říční tůně. Konkrétní příběh na trase se nepodařilo doložit a jsou potřeba pro hustotu míst. Kapitola „Řeka a povodně 2002“ se nezaložila (povodeň je doložena jen jedním zdrojem).
- **Co zůstává neověřené (hlavní).** Všechno v `obsah.json` 2.–4. etapy má dosud jen Wikipedii nebo jeden další zdroj; seznam tvrzení a druhých zdrojů je v `docs/obsah-vltavska-podklady.md` („Úkoly k ověření: příběhy 2.–4. etapy“). Nejslabší: veletrh ve Veltrusích („první na světě“ je sporné), Řež (jediný zdroj), Červený mlýn (uživatelský web), spád zdymadla Hořín (8,5 vs 8,8 m), souřadnice Dolan, Lobečku, Letek a Zámku Hořín (nepřesné, neopravovány). Počty obětí a bomb z náletu na Kralupy se nepoužily.
- Fotky se nestahovaly; kandidáti z Wikimedia Commons s autorem a licencí jsou v podkladech.

## 0024 Návrat se spotřebuje přehráním (balík F)
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy čisté logiky, na zařízení NEOVĚŘENO

- **Problém.** Karta „Od posledně“ zmizela, jakmile chodec opustil Domů (jiná záložka, otevřená zastávka), i když návrat nepřehrál: Domů volalo `markSeen` při odchodu (0022).
- **Spotřebuje se jen přehráním nebo zavřením.** Odchod z Domů nic nemění. Návrat z Domů se zapamatuje, až `/navrat` dojede do konce (i po „Přeskočit“ nebo při „Omezit pohyb“, kdy se výsledek ukáže hned), a to jen do konce přehraného úseku: co přibylo během přehrávání, zůstane na příště. Na kartě je nenápadné „Zavřít“, které zapamatuje celý postup. Ukázkový režim (`demo.seenM`) jde stejnou cestou. Čistá logika: `seenAfter`, `returnSource` v `src/navrat.ts`; `markSeen` v `ExpeditionProvider` bere nepovinné `upToM`.
- **Neviděné dny se sčítají.** Viděná hodnota zůstává poslední viděná, úsek proto roste přes víc dní. Nadpis karty je stejný jako na obrazovce návratu (`returnHeading`), např. „Od 24. 10. jste ušli“.
- **Přehrát den z Kroniky.** Každý den v Deníku má odkaz „Přehrát den“ na `/navrat?from&to&zdroj=kronika` (km začátku a konce dne z `daySlices`, `dayReplayParams`). Takové přehrání návrat nespotřebuje.
- **Domů bez opakování.** Pořadí: postup etapy (s posledním čtením a dlaždicemi), Od posledně, další zastávka s hádankou, „Kam dnes dojdu“, „Nedávno objeveno“, kapitoly. Když je v dosahu „Kam dnes dojdu“ prázdno a nejbližší místo je ta zastávka z karty nad tím, věta ji neopakuje (`reachEmptyText` v `src/home.ts`). Komponenta `WhereToday` se kvůli tomu přesunula do `components/WhereToday.tsx`, protože `HomeSections.tsx` paralelně upravuje balík H; stará kopie tam zůstává nepoužitá a smaže se po sloučení.
- Příchod naživo (`ArrivalHost`) při zavření dál volá `markSeen`: chodec nová místa viděl v reálném čase.
- Neověřeno: chování na zařízení, nadpis návratu při přehrání staršího dne z Kroniky (říká „Od pátku jste ušli“, obrazovku upravuje balík G).

## 0025 Zastavení u míst v návratu (balík G)
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy čisté logiky a webovým exportem v Chromiu (karta, „Dál“, rychlá razítka), let kamery MapLibre a nativní vykreslení NEOVĚŘENO

- **Proč.** Na telefonu let míjel místa příliš rychle a razítko jen dopadlo; nebylo vidět, co člověk objevil. Návrat se teď u míst zastaví a ukáže kartu místa.
- **Plán zastavení** (`returnPlan` v `src/navrat.ts`, testy v `navrat.test.ts`). Let samotný se nemění (`flightDurationMs` 4–9 s, ease-in-out po úseku); mění se jen převod skutečného času přehrávání na „čas letu“: pohyb → brzdění → stání → rozjezd → pohyb. Brzdění a rozjezd trvají po 1 s (rychlost klesá lineárně k nule, takže pohyb plynule navazuje a kamera zastaví přesně na místě); u míst těsně za sebou si mezeru dělí napůl. Kamera se při brzdění přiblíží o +0,5 zoomu (`holdZoomAt`, `flightZoom(…, holdZoom)`) a při rozjezdu vrátí.
- **Délky.** Zastávka 5 s, malý objev 3 s, dokončená etapa 6 s s pečetí etapy (končí-li etapa u zastávky, je to jedno zastavení 6 s; mimo místo samostatné). Od 6 míst v úseku se stojí jen u zastávek a konců etap, ostatní dostanou rychlé razítko jako dřív (rozestup ≥ 250 ms i od razítek zastavení) a jsou v souhrnu na konci.
- **Celková délka** (`returnTotalMs`): cíl zhruba 15–40 s. Krátký úsek bez míst trvá jen let (4 s), nic se neprotahuje. Nad 40 s se zastavení mění na rychlá razítka: nejdřív objevy, pak zastávky, vždy to, které leží nejtěsněji u jiného zastavení; konce etap zůstávají. Pilot: celá trasa 36,5 s (4 konce etap), denní úseky 11 km kolem 26–28 s.
- **Hodiny.** Jedny hodiny `useClock` (krok 50 ms); kamera dál dostává `easeTo` ze stejných hodin s polohou po 1/600 úseku, při stání se poloha ani zoom nemění, takže kamera stojí bez nových pokynů. „Čas letu“ při zastavení stojí; `useClock` navíc umí `pause`/`resume` (klepnutí na kartu otevře `/zastavka/[id]`, u etapy bez místa pohlednici; po návratu `useFocusEffect` pokračuje od stejného času) a `seek` („Dál“ nebo přejetí karty skočí na konec zastavení). „Přeskočit vše“ skočí na souhrn. Klepnutí na mapu už let nepřeskakuje (kolidovalo by s kartou).
- **Karta** (`components/HaltCard.tsx`): fotka (jinak kreslený rámeček se jménem), typ a km (u konce etapy „konec etapy II“), název, první věta háčku (`firstSentence`; bez háčku věta místa), tenká linka zbývajícího času a „Dál ›“. Razítko (vosková pečeť zastávky, razítko objevu, nebo pečeť etapy) dopadne na kartu a zároveň na mapu doprostřed, kde kamera nad místem stojí (na webu jen na kartu, mapa je tam statický náčrt).
- **Omezit pohyb.** Kamera stojí nad celým úsekem, karta se jen prolne (bez vyjetí), razítka se prolnou. Přehrávání ale běží (dřív se při „Omezit pohyb“ ukázal rovnou výsledek), aby byly karty vidět.
- Neověřeno: plynulost brzdění a přiblížení `easeTo` na zařízení, gesto přejetí na kartě (PanResponder uvnitř `Pressable`), čitelnost karty přes mapu na malých displejích.

## 0026 Kapitoly jako příběh (balík H)
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy čisté logiky a webovým exportem v Chromiu (ukázkový postup 36 km a 70 km, světlý vzhled), na zařízení NEOVĚŘENO; texty kapitol **neověřené** (`verified: false`)

- **Kapitoly patří jen k aktuální výpravě.** Kapitola je nitka příběhu přes víc míst jedné výpravy (`obsah.json` → `chapters`, místa podle `chapterId` příběhů). Kapitoly přes víc výprav (např. „Mosty“ na Vltavě i jinde) jsou budoucí krok: chtěly by vlastní soubor mimo výpravu a stav napříč výpravami v Kronice.
- **Obsah.** Kapitoly mají navíc `intro` a `outro` (2–3 věty, jen z faktů, které už jsou v příbězích míst), `titleGenitive` pro věty „do uzavření Mostů a lávek“ a `verified: false`. Schéma `storyChapter` (`packages/content/src/story.ts`) má nová pole volitelná; test hlídá, že pilot je má všechny. Loader aplikace (`data/vltavska.ts`) je předává dál.
- **Čistá logika** v `apps/mobile/src/kapitoly.ts` (+test): stav kapitoly (objevená = výprava běží a ušlo se k místu), nejbližší kapitola (z neuzavřených ta, které chybí nejméně míst; při shodě ta s bližším dalším místem), místa v pořadí trasy s dnem objevu z `events` nebo zbývající vzdáleností, věty a monogram pečeti.
- **Obrazovky.** Nová `/kapitola/[id]`: název, úvod, postup s pečetí, místa (objevená s fotkou nebo razítkem a datem, zamčená s hádankou, upoutávkou nebo názvem a „za X km“), po uzavření závěr a „Poslat jako pohlednici“. Domů ukazuje jen nejbližší kapitolu a odkaz „Všechny kapitoly“ do Sbírek (`/kronika?tab=sbirky`). Ve Sbírkách je každá kapitola klepací; uzavřená má voskovou pečeť s monogramem (`ChapterSeal`, vlastní komponenta, sdílená `Seal` se neměnila), otevřená zamčený kroužek. Pod nadpisem kapitol na Domů i ve Sbírkách je vysvětlující věta. Detail místa dostal jen štítek `ChapterTag` („Kapitola Voraři · 5/7“).
- **Pohlednice z kapitoly** využívá `/pohlednice` s parametrem `chapter`: líc s názvem kapitoly (fotka z míst kapitoly, jinak náčrt etapy posledního místa), rub z objevených míst kapitoly. Čísla etapy, karta další etapy a „Uložit do Kroniky“ se u kapitoly neukazují (ukládání pohlednic je po etapách). Pečeť na líci zůstává etapová; vlastní pohlednice kapitoly je budoucí krok.
- Nezahrnuto: ilustrace dokončené kapitoly na okraji atlasu (návrh prožitku), animace uzavření pečeti, kapitoly přes víc výprav. Původní `chapterProgress` v `kronika/collections.ts` zůstává kvůli testům, aplikace ho už nepoužívá.

## 0027 Drobnosti z videa z telefonu (balík I)
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy a webovým exportem v Chromiu (360 dp, světlý vzhled, ukázkový postup), na zařízení NEOVĚŘENO

- **Místo bez fotky a zamčené místo.** Záhlaví detailu místa ukáže zástupný list atlasu (`PlaceSheet` v `components/PlaceHero.tsx`): papír, šikmé šrafování, dvojitý okrový rámeček, druh místa a etapa kapitálkami IM Fell a kruh s monogramem. Zamčené místo **fotku neodhaluje** (dřív šedá rozmazaná plocha, která vypadala jako chyba, např. Zámek Veltrusy): ukáže stejný list s papírovým závojem a zámkem; fotka přijde s odemčením.
- **Monogram** (`src/monogram.ts`, test): první písmena prvního a posledního významného slova, předložky se přeskakují, upřesnění „nad …/pod …“ se vynechá, jednoslovný název dá dvě písmena („Vepřek“ → „Ve“). Shodné monogramy v jednom seznamu dostanou horní index („ZH“, „ZH²“).
- **Jednotky.** Číslo a jednotka se nesmí rozdělit: `keepUnit`, `formatDistanceNoWrap` a `formatKmMark` ve `format.ts` dávají pevnou mezeru („ještě 4,0 km“ se na úzkém řádku dřív zalomilo a „km“ zmizelo; „900 / m.“ ve Sbírkách). Ruční formátování „km 4,0“ v detailu místa, přívozu a příbězích nahradilo `formatKmMark`; sloupce „Kdy chodíte nejvíc“ mají jednotku v podnadpisu. `formatDistance` a `formatKm` se nezměnily (Domů s nimi dál počítá).
- **Rozložení detailu místa.** V pevném spodním pruhu zůstává jen „Další místo / Další zastávka“; „Poslat jako pohlednici“ a „Převezli jste se…“ jsou v toku obsahu. Odsazení obsahu se řídí změřenou výškou pruhu, takže nic nezůstane pod ním (a pohlednice jde poslat i z posledního místa, kde pruh není).
- **Voda v mapě.** Vodní plochy (od zoomu ~13 i koryto Vltavy) jsou akvarel s krytím 0,42 jako rozpitý podklad čárové řeky, s rozpitým pruhem u břehu a přerušovaným okrajem; jádro čárové řeky od zoomu 12 slábne (0,95 → 0,3), aby uvnitř plochy nevznikl sytý pruh. Ve skice má plocha tužkový břeh a druhou přerušovanou linku. Barvy jen z palety atlasu (světlý i noční), testy hlídají krytí a absenci zoomového přepínání.
- **Sbírky, Razítka.** Malé pečeti s monogramem: získané rumělkový vosk (klepnutí otevře `/zastavka/[id]`), nezískané slepý tužkový obrys. Sekce „Pečeti kapitol“ beze změny (balík H).
- **Objevovat.** Karty připravovaných výprav mají větu „Připravujeme. Až bude výprava hotová, objeví se tady.“ (`UPCOMING_NOTE`).
- Neověřeno: vykreslení vody na zařízení (MapLibre Native, `line-offset` u ploch), vzhled zástupného listu v tmavém vzhledu na telefonu.

## 0028 Plynulý let návratu řízený mapou a texty „Od posledně přibylo“
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy, na telefonu se ověřuje

- **Problém.** Na telefonu (motorola edge 50 fusion) se let návratu sekal: mapa se pohnula a 150–250 ms stála. Kamera dostávala `easeTo` každých 50 ms přes JS a každý pokyn rušil předchozí. Navíc se při každém kroku znovu posílala do mapy celá trasa (nový objekt `line(coords)`), ušlá část od začátku výpravy i bod značky.
- **Kamera podle plánu.** `FlightMap` dostane `cameraAt(ms)` (poloha a přiblížení z `returnPlan`) a čas hodin. Kameře se pošle jeden pokyn na úsek 700 ms (`SEG_MS`) s cílem na konci úseku; plynulost počítá MapLibre nativně. Zastavení u míst, „Dál“ i pauza zůstávají ze stejných hodin.
- **Značka uprostřed.** Za letu je značka „vy“ pevně uprostřed mapy (kamera je na ní), v mapě se kreslí až po skončení.
- **Data jen při změně.** Celá trasa a ušlá část před úsekem jsou neměnné; za letu se posílá jen geometrie úseku (po 1/300).
- **Záběr s cílem.** Po skončení záběr zahrne i další zastávku, je-li do 3 km za koncem úseku. Bez nového místa spodní panel neříká „Žádné nové místo“, ale „Na obzoru: Zámek Veltrusy, ještě 870 m“ s hádankou.
- **Texty** (docs/nazvoslovi.md, rozhodnutí 0029): „Od posledně přibylo“ místo „Dnes jste ušli“ (číslo není součet dne a odporovalo dlaždici „Dnes“), „Přehrát cestu“, „Odemkli jste“, „Objev“ místo „Malý objev“, „Přeskočit“. Rámeček mapy ukazuje skutečnou etapu („Etapa III · Vltavská stezka“), ne napevno „List I“. Karta „Od posledně“ už neopakuje číslo ve větě (`changeDetails`).

## 0029 Názvosloví (balík J)
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy a webovým exportem v Chromiu (390 dp, světlý vzhled, ukázkový postup), na zařízení NEOVĚŘENO

- **Názvosloví** je v [`docs/nazvoslovi.md`](nazvoslovi.md): výprava, etapa, místo, zastávka, objev, razítko, pečeť, kapitola, odemknout, „Od posledně přibylo“, „Přehrát cestu“, hádanka a tip. „List“ už v textu není synonymem etapy; zůstává jen jako ozdobný titulek rámečku mapy s číslem etapy. Etapa se dokončí, kapitola uzavře.
- **Uplatněno v textech:** „Další malý objev“ → „Další objev“ (Domů, Výprava, detail místa, Objevy); „Nedávno objeveno“ → „Nedávno odemčeno“; „Objeveno“ → „Odemčeno“ v kapitole; „List II“ → „Etapa II“ (Sbírky, Výprava); „Razítka“ → „Razítka míst“; věta změny (`changeSentence` v `packages/core`) „Od posledně jste ušli … Minuli jste: … Přibyl 1 malý objev.“ → „Od posledně přibylo … Odemkli jste: … Přibyl 1 objev.“ (a správně „Přibyly 2 objevy“); rub pohlednice „Cestou jste minuli“ → „Cestou jste odemkli“; Deník „Objev dne / Dnes jste objevili / Den bez objevu“ → „Místo dne / Dnes jste odemkli / Den bez nového místa“; dlaždice „Pohlednice · do konce etapy“ → „Do pohlednice · konec etapy“; „Tipnout si odpověď“ → „Tipnout si“.
- **Domů, další zastávka:** celá karta otevře místo; tip k hádance je vedlejší odkaz „Tipnout si / Změnit tip“, ne hlavní červené tlačítko.
- **Pohlednice ze Sbírek** (`from=sbirky`), když má chodec etapu za sebou: bez „Etapa dokončena“, čísel, karty další etapy a bez „Uložit do Kroniky“, pokud už uložená je; jen pohlednice, „Poslat“ a „Zpět“. Tlačítka jsou v pevném pruhu nad systémovou lištou (`insets.bottom`). „Poslat“ (na všech pohlednicích) sdílí text pohlednice systémovým sdílením (`Share`); obrázek dál nejde (0022).
- **Sbírky, razítka** jsou seskupená po etapách (nadpis „Etapa II · …“, počet), pod každým krátký název na jeden řádek (`shortPlaceName` ve `format.ts`: bez „nad/pod …“, delší po celých slovech se třemi tečkami). Nezískané místo je slepý obrys s „?“ a bez názvu.
- **Kronika:** velká karta se zeměkoulí jen na Deníku, na Cesta, Rok a Sbírky jeden tmavý řádek „km · kroky ›“.
- **Karta života:** místo „Z čeho číslo je: ověřeno / odhad z kroků“ věta „371 km, z toho 41 km změřil telefon přesně, zbytek jsme dopočítali z kroků.“ (`confidenceSentence`); pruh a vysvětlení až po „Jak počítáme?“. Popisky pruhu: „změřeno telefonem“, „dopočítáno z kroků“, „zadáno ručně“.
- **Vysvětlující věta o kapitolách** se ukazuje jen, dokud chodec neotevře žádnou kapitolu (`footatlas.chapteropened.v1` v AsyncStorage, `useChapterExplainer`).
- Nezahrnuto (soubory souběžné relace 0028): „Dnes jste ušli“ na kartě návratu, „Přehrát návrat“ → „Přehrát cestu“, „Malý objev“ na kartě zastavení.
- Neověřeno: systémové sdílení na Androidu a iOS, safe area pruhu pohlednice na telefonu s gestovou lištou, kompaktní řádek Kroniky s načtenou historií (v ukázkovém postupu historie není).

## 0030 Návrh v2: tři záložky, Mezitím, nový let, razítka se symboly, témata
Datum: 9. 11. 2026 · Stav: přijato k realizaci (balíky K–N); podrobnosti v [navrh-v2.md](navrh-v2.md)

- **Proč.** Tři videa z telefonu ukázala, že Domů a Výprava ukazují totéž, kapitoly výpravy jsou rozházené mezi Domů a Kroniku, „Dnes“ po několika dnech pauzy lže a let návratu je sice plynulý, ale honí tečku zblízka, jede stůj–jeď a nic nekreslí.
- **Tři záložky:** Výprava (mapa a panel, otevírá se jako první), Atlas (výpravy, razítka, témata), Kronika (deník, životní cesta, rok). Domů a Objevovat zanikají. Nahrazuje § 8 specifikace.
- **Mezitím** je chvíle po otevření, ne záložka: pruh na Výpravě, po dokončené etapě nebo pauze ≥ 3 dny přehrání přes celou obrazovku. Nikdy „Dnes“.
- **Před vámi** nahrazuje „Kam dnes dojdu“: pás trasy a odhad podle vlastního tempa.
- **Let:** úvodní a závěrečný záběr, oddálená kamera, pero kreslí čáru, plynulé barvení, místa za letu bez zastavení (zastávky a konce etap se zastavením s plynulým dojezdem a rozjezdem).
- **Razítka se symboly** podle typu místa (16 symbolů, česká tradice turistických známek), pečeti etap a kapitol s kresbou.
- **Kapitola vs. téma:** kapitola patří k výpravě a uzavře se; téma prochází atlasem a roste s každou výpravou (`themeId`).
- Konkurence (Pikmin Bloom, Relive, The Conqueror, World Walking) je rozebraná v navrh-v2.md § 2.

## 0031 Témata napříč výpravami (balík N)
Datum: 9. 11. 2026 · Stav: přijato; datový model a čistá logika s testy, **bez obrazovky**; úvody témat **neověřené** (`verified: false`); podrobnosti v [navrh-v2.md](navrh-v2.md) § 7

- **Model.** Téma je samostatná položka obsahu v `packages/content/data/temata.json`, mimo složky výprav, protože ho sdílí víc výprav: `id`, `title`, `titleGenitive`, `symbol` (jeden z 16 symbolů razítek, § 6.1; pečeť kapitoly má symbol svého tématu, § 6.3), `intro` (2–3 věty obecně, ne o jedné řece), `milestones` (ostře vzestupné počty míst) a volitelně `unit` (tvary slova pro věty: „1 most / 3 mosty / 10 mostů“; bez něj se počítají „místa“). Schéma `theme` / `themeFile` a `parseThemes` jsou v `packages/content/src/theme.ts`.
- **Kapitola má `themeId`** (`storyChapter` v `obsah.json`, volitelně i `chapter` ve schématu výpravy). Ve schématu je pole volitelné, aby obsah šel psát postupně; `checkChapterThemes` a testy hlídají, že ho každá kapitola vydávaného obsahu má a že téma existuje. Pro Vltavskou stezku je pět témat 1:1 s kapitolami: `vorari` (vor), `mosty` (most), `ostrovy` (ostrov), `pocatky` (hradiště), `sidla` (zámek). Téma se jmenuje obecněji než kapitola („Mosty“ vs. „Mosty a lávky“).
- **Logika** v `apps/mobile/src/temata.ts` (čisté funkce, testy): `themeProgress` sečte kapitoly všech výprav se stejným `themeId` (místo ve dvou kapitolách jednou), vrátí počet odemčených míst, stav kapitol, uzavřené kapitoly po výpravách a nejbližší milník s počtem chybějících míst a příznakem, zda ho jde splnit v dosud známých výpravách. `expeditionThemeContribution` dá věty pro výběr výpravy („Tato výprava přidá 3 mosty do tématu Mosty“), `milestoneSentence` „Ještě 2 místa do milníku 10 mostů“ (bez `unit`: „… do milníku 10 míst Počátků Čech“). Plurál 1 / 2–4 / ostatní (`pluralCs`). Témata pro UI exportuje `apps/mobile/src/data/temata.ts`; loader výpravy předává `themeId` kapitol.
- **Proč milníky.** Kapitola má pevný počet míst a uzavře se; téma roste s každou výpravou, takže „4/7“ by se s novou výpravou změnilo na „4/12“ a postup by vypadal jako ztráta. Milník je pevný cíl (3, 10, 25 míst), který s přibývajícími výpravami neutíká, a dává tématu další krok i po uzavření všech jeho kapitol. Milníky jsou daleko za jednou výpravou záměrně (Mosty: 4 místa na Vltavě, milník 10), téma tím zve k další výpravě; `nextMilestoneReachable` pozná, kdy milník na další výpravu čeká.
- **Když přibude výprava.** Do jejího `obsah.json` se kapitolám doplní `themeId` existujících témat, případně se do `temata.json` přidá nové téma. Téma pak automaticky sečte nová místa i kapitoly, uzavřené pečeti přibudou ve skupině nové výpravy a dosavadní postup se nemění (počet odemčených míst ani splněné milníky neklesají). Podmínka: **id míst jsou jedinečná v celém atlasu**, protože odemčená místa se předávají jednou sadou; kontrolu přes výpravy je potřeba přidat s druhou výpravou.
- Nezahrnuto: obrazovka tématu a sekce v Atlasu (balík L / později), kresby symbolů (balík M), stav témat v Kronice.

## 0032 Razítka se symboly
Datum: 9. 11. 2026 · Stav: přijato; ověřeno testy a webovým exportem v Chromiu (390 dp, světlý vzhled, ukázkový postup), na zařízení NEOVĚŘENO

- **Proč.** Monogramy uprostřed razítek („ZdH“, „PT“) nikdo nerozluštil. Podle návrhu v2 (§ 6, rozhodnutí 0030) a vzoru českých turistických známek nese razítko kreslený symbol podle typu místa.
- **Obsah.** Místo má nepovinné pole `symbol` s jednou ze 16 hodnot (`hradiste`, `zamek`, `most`, `lavka`, `ostrov`, `zdymadlo`, `pristav`, `privoz`, `vor`, `skala`, `obec`, `nota`, `mlyn`, `vyhled`, `rakos`, `soutok`; `packages/content/src/symbols.ts`, bez zodu, aby šel importovat i v aplikaci). Schéma odmítne jinou hodnotu, test hlídá, že každé z 39 míst Vltavské stezky má symbol přesně podle tabulky v navrh-v2 § 6.1. Loader aplikace neznámou hodnotu zahodí.
- **Kresby** jsou vlastní, ne z ikonové sady: `apps/mobile/src/components/stamps/` (geometrie v `glyphs.ts`, jedna komponenta na symbol a mapa `STAMP_SYMBOLS`). ViewBox 24, jedna linka 1,6 se zaoblenými konci, bez výplní, jen drobné tenčí šrafy (0,9), barva z props. V malých razítcích se linka zesílí na 2. Náhled: `docs/razitka/symboly.png` (skript `apps/mobile/scripts/razitka-nahled.mjs`) a sekce „Symboly razítek“ ve vývojovém panelu (`docs/razitka/aplikace.png`).
- **Razítko** (`Seal`, druhy `stamp` a `wax`): uprostřed symbol, u razítka pod ním km a datum. Pořadí záloh: symbol → fotka (jen vosk) → monogram názvu. Symbol se doplní sám podle `placeId` nebo jména místa, takže stávající volání (návrat, zastavení, pohlednice, přívoz, Domů) symbol dostanou beze změny. Pod 64 px (`COMPACT_SEAL_PX`) razítko vynechá text po obvodu i km a datum a ukáže jen rámeček a větší symbol.
- **Zamčené razítko** (`kind: "locked"` se `symbol`, `placeId` nebo `name`): slepý čárkovaný obrys se stejným symbolem tužkou, vybledle. Chodec vidí, že ho čeká most, ne který. Bez symbolu zůstává otazník.
- **Pečeť etapy:** vosk s římským číslem a drobným symbolem cíle etapy (symbol posledního místa etapy, `stageSymbol`). Doplní se podle `stageIndex` nebo římského čísla, takže i karta zastavení a pohlednice ji mají bez úprav. Ve Sbírkách nahrazuje prázdný kroužek u dokončené etapy.
- **Pečeť kapitoly** (`ChapterSeal`): Voraři = vor, Mosty a lávky = most, Ostrovy = ostrov, Počátky Čech = hradiště, Šlechtická sídla = zámek (podle id i názvu, `chapterSymbol` v `razitka.ts`). Uzavřená je vosk se symbolem, otevřená slepý obrys se stejným symbolem; kapitola bez symbolu má dál monogram a zámek.
- **Sbírky:** mřížka razítek používá kompaktní `Seal` (48 px), monogramy a `PlaceStamp` zrušeny. Struktura obrazovky beze změny.
- **Beze změny:** medailony na mapě (předgenerovaná PNG v `map/medallionFiles`), `SealBadge` na fotce místa, monogram na zástupném obrázku místa bez fotky (`PlaceHero`).
- **Nota:** symbol `nota` je lyra s notou mezi strunami; v 28 px čte spíš jako lyra.
- Neověřeno: vykreslení na telefonu (react-native-svg, `transform` u vnořené skupiny), tmavý vzhled.

## 0033 Nový let přehrání cesty (balík K)
Datum: 10. 11. 2026 · Stav: přijato; ověřeno testy a typovou kontrolou, na telefonu NEOVĚŘENO (plynulost se na webu ani v emulátoru posoudit nedá)

Realizace navrh-v2.md § 1.2 a § 8 (bez haptiky). Nahrazuje časování z 0025 (zastavení 5/3/6 s, let 4–9 s); princip kamery z 0028 (pokyn po úsecích `SEG_MS` = 700 ms, plynulost počítá MapLibre) zůstává.

**Časování (`src/navrat.ts`, `returnPlan`):**

| Fáze | Délka | Poznámka |
|---|---|---|
| Úvodní záběr | 2,0 s | `fitBounds` na úsek a místo na obzoru (do 3 km za cílem), bez animace |
| Ponoření | 1,0 s | `easeTo` na start úseku, zoom pro 2–3 km na šířku obrazovky |
| Kreslení | 8–20 s podle délky (lineárně 1–15 km) | cestovní rychlost se dopočítá tak, aby se do toho vešla i místa; pohyb aspoň 60 % (a 6 s) |
| Místo za letu (objev) | — | zpomalení na 25 %, rampy 0,6 s, pomalý průlet ≥ 1,2 s, štítek 2,5 s; let nezastaví |
| Zastávka / konec etapy | 3,5 s / 5 s | plné zastavení, dojezd i rozjezd 0,8 s |
| Závěrečný záběr | 1,5 s | `fitBounds` na úsek nad souhrnem (spodní okraj = 40 % výšky) |

- **Spojitá rychlost.** Rychlost je po částech kosinová (rampy mají spojitou rychlost i zrychlení), poloha hrotu je její integrál. Test vzorkuje rychlost po 16 ms přes celé přehrání a hlídá, že mezi snímky se nezmění o víc než 5 % cestovní (rampa 0,6 s dělá nejvýš ~3,1 %); totéž na denních úsecích celé Vltavské stezky. Místo za letu, na které není místo pro plynulý dojezd (těsně u zastávky, startu nebo cíle), nezpomalí; dvě blízká místa za letu mají jedno společné zpomalení.
- **Mnoho míst a rozpočet.** Od 6 míst v úseku dostanou objevy jen rychlé razítko (bez štítku a zpomalení, rozestup ≥ 250 ms). Přes 40 s se nejdřív zastávky (nejtěsněji u jiného místa) změní na místa za letu, pak místa za letu na rychlá razítka; konce etap zůstanou vždy. Běžný denní úsek 10–25 km s pár místy trvá 20–25 s (test).
- **Kamera.** Přiblížení z šířky záběru `flightWidthM` (2 km do 2 km úseku, 3 km od 20 km) a skutečné šířky mapy (`zoomForWidth`), tj. zoom ≈ 13, ne 15. Předstih: střed je 20 % šířky před hrotem, úměrně rychlosti, takže při zastavení je kamera přesně na místě (razítko a pečeť dopadnou doprostřed). Při každém `easeTo` se posílá nulový `padding`, protože `fitBounds` ho jinak v kameře nechá.
- **Náklon 0°** (`FLIGHT_PITCH`). Návrh zkouší 30°, ale vzory atlasu jsou rastrové a v náklonu se v horní části slévají, popisky IM Fell se zmenšují a hrot pera i předstih se počítají v rovinné projekci. Vizuálně jsme náklon nezkoušeli (nebylo na čem); ověří se na telefonu změnou konstanty (§ 11).
- **Hrot pera** (`PenTip`) je RN overlay. Jeho posun od středu se spočítá z plánu (`screenOffsetDp`, Web Mercator) na konci každého úseku a dojede tam nativní animací stejně dlouho a lineárně jako kamera. Značka „vy“ se za letu nekreslí.
- **Plynulé barvení: varianta „čára s `line-blur`“.** Maska `revealMask` se počítá jen jednou pro celý úsek (do `toM`); nevybarvenou část kryje široká papírová čára (`revealPendingLayers`, šířka 2,2 × 650 m v metrech přes exponenciální výraz, rozmazání 0,5 × 650 m) od kousku před hrotem do cíle. Za letu se tak posílá jen zkracující se čára (po 1/800 úseku), žádná polygonová unie. Varianta „maska kolem hrotu“ by kvůli obrácené masce (papír s dírou) potřebovala dělit krytí na disjunktní kusy a počítat polygonový rozdíl při každém kroku hodin v JS; to by na telefonu ubíralo snímky. Daň: kde se budoucí trasa vrací do 650 m k už vybarvené (meandry), je tam papír do průletu pera.
- **Méně šumu.** Za letu se vzory (vrstvy s `fill-pattern`: šrafy, stromy, vinice, skica i kolorovaná) ztlumí na 50 % (`patternDimLayers`) úpravou existujících vrstev stylu (komponenta `Layer` se stejným id), po skončení se vrátí.
- **Štítek místa za letu** (`FlyLabel`): nahoře, nejvýš 25 % výšky, razítko nebo fotka s razítkem, typ · km, název (zalomí se), krátká věta (`shortSentence`, nejvýš 110 znaků po celé části věty). Klepnutí otevře místo a pozastaví.
- **Karta zastávky** (`HaltCard`): záhlaví bez uříznutí (konec etapy na vlastním řádku), razítko uvnitř karty (bez fotky je samo obrázkem, s fotkou v jejím rohu), menší fotka (72) a nižší karta, bez prázdného papírového rámečku.
- **Pečeť konce etapy** (`StageWax`): `Seal` druhu `wax` s `roman` a `symbol` cíle etapy; kresbu čísla a symbolu dodá balík M (do té doby `Seal` tyto props ignoruje).
- **Souhrn**: přes spodek mapy, nejvýš 40 % výšky; místa jako vodorovná řada malých razítek s názvem pod nimi; „Na obzoru“ zůstává. „Přeskočit“ skočí na závěrečný záběr.
- **Omezit pohyb:** kamera stojí od začátku na celém úseku (už s místem pro souhrn), razítka a karty se jen prolnou.
- **Ověřit na telefonu:** plynulost kamery a barvení (60 fps), shoda hrotu pera s koncem čáry, vzhled rozmazaného okraje barvy, náklon 30° proti 0°, čitelnost štítku a karty, zda je zoom 2–3 km správně.

## 0034 Tři záložky a Mezitím
Datum: 10. 11. 2026 · Stav: přijato (balík L, [navrh-v2.md](navrh-v2.md) § 3, 4, 4.1, 5 a 9); ověřeno testy a webovým exportem v Chromiu (390 dp, světlý vzhled, ukázkový postup), na zařízení NEOVĚŘENO

- **Záložky Výprava, Atlas, Kronika.** Výprava se otevírá jako první (`unstable_settings.initialRouteName`). Domů a Objevovat zanikly; `/` (také `footatlas://`) přesměruje `app/index.tsx` na `/vyprava`, `/objevovat` přesměruje `app/objevovat.tsx` na `/atlas`, `/kronika?tab=sbirky` vede do Atlasu.
- **Výprava bez výpravy:** výběr výpravy (dřívější „Vyrazit“ z Domů) a pod ním Životní cesta (`LifePathView`).
- **Panel Výpravy** (mapa beze změny): tři polohy sbalený / poloviční (výchozí) / celý (`src/panel.ts`, s testy). Hlavička etapy je úchyt: táhnutí posouvá, klepnutí přepíná poloviční a celý. Obsah: hlavička etapy, **Další cíl**, **Před vámi**, kapitoly, „Nedávno odemčeno“ a místa po etapách. Komponenty z `HomeSections.tsx` se přesunuly do `PanelSections.tsx` (beze změny vnitřku, jen odkaz „Všechny kapitoly“ vede do Atlasu).
- **Další cíl** (`src/cil.ts`, s testy): konec etapy do 3 km → uzavření kapitoly do 3 km (k poslednímu chybějícímu místu) → další zastávka. Hranice 3 km včetně.
- **Před vámi** (`src/predvami.ts`, s testy; nahrazuje `WhereToday`): pás 8 km před chodcem se zamčenými razítky (`Seal`), tempo = průměr posledních 14 dní s pohybem (≥ 200 m) **před dneškem** z kroniky a výpravy (pro stejný den větší hodnota). Názvy míst v obsahu nemají 2. pád, proto věty „Za 2 dny vás čekají Zámek Veltrusy a Červený mlýn.“ a „Za 30 minut chůze (asi 2 700 kroků) vás čeká Zámek Veltrusy.“ místo „jste u Zámku …“. Odměna „Do pohlednice etapy III: 12,1 km.“ do 15 km. Táhnutím po pásu „Do sem: 4,0 km, asi 50 minut, 3 místa“; nic se neukládá. Slovo „dnes“ se nepoužívá (hlídá test).
- **Mezitím** (`src/mezitim.ts`, s testy; nahrazuje `ReturnCard`): pruh nahoře na Výpravě „Mezitím · 23,4 km za 5 dní · 3 nová místa“, „Přehrát cestu“, „Zavřít“. Nadpis `mezitimHeading` („Mezitím přibylo“, „Od včerejška přibylo“, „Za 5 dní přibylo“, „Od 24. 10. přibylo“) je zatím jen v přístupném popisku pruhu; obrazovka `/navrat` (balík K) má vlastní `returnHeading`. Podmínka zobrazení a spotřebování beze změny (0022, 0024).
- **Mezitím přes celou obrazovku:** `/navrat` se otevře samo, když se mezitím dokončila etapa nebo od posledního otevření uběhly ≥ 3 dny; nejvýš jednou za otevření. Čas otevření se ukládá při spuštění a při návratu z pozadí (`footatlas.lastopened.v1`, `useLastOpened`). Při prvním spuštění nové verze záznam chybí, takže jen pruh.
- **Atlas:** výpravy (aktuální, dokončené, další), razítka a pečeti (`CollectionsView` beze změny, jen s rozjetou výpravou), pohlednice etap, Témata jako zástupná sekce pro balík N, druhy tras.
- **Kronika:** bez Sbírek; dlaždice Dnes / Za 7 dní v hlavičce Deníku (`DiaryTiles`).
- Neověřeno na zařízení: táhnutí panelu a pásu na Androidu (střet s posuvem panelu), automatické otevření po návratu z pozadí.
