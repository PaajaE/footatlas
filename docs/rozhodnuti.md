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

## 0013 Mapa se stahuje z Cloudflare R2, ne z APK ani z gitu
Datum: 31. 10. 2026 · Stav: přijato, nasazeno; stahování ověřeno proti produkci na emulátoru Android 16 (release build)

- Koridor Vltavské stezky (26 MB PMTiles) **není v gitu ani v APK**. Leží v R2 bucketu `footatlas-content` pod `maps/<název>-<12 znaků SHA-256>.pmtiles` a aplikace ho při prvním spuštění stáhne do úložiště (`src/map/mapAssets.ts`), ověří velikost a použije jako `pmtiles://file://…`. Název s otiskem obsahu znamená, že se soubor nemění a smí se kešovat navždy; nová verze dat = nový název, nová verze aplikace (`src/map/mapSource.ts` generuje `tools/maps/publish.sh`).
- Doručuje ho Worker `apps/api` (`GET /content/<klíč>`, HEAD, `Range`, `ETag`, `Cache-Control: immutable` pro `maps/`). Bucket zůstává soukromý, veřejný je jen Worker. Adresa serveru je v `app.json` v `extra.apiBaseUrl`.
- Důvod: velké binárky nepatří do gitu (každá verze zůstane v historii navždy) a ani do APK (při více výpravách by rostlo); R2 nemá poplatky za odchozí data a Worker dává kontrolu nad kešováním.
- První spuštění potřebuje připojení (26 MB); do té doby a při selhání se ukazuje náhled trasy se zprávou a tlačítkem „Zkusit znovu“. Písma map (0,6 MB) zůstávají v APK.
- **Stav 31. 10. 2026:** Worker `footatlas-api` je nasazený na `https://footatlas-api.ecerpavel.workers.dev` (vazba `CONTENT` → `footatlas-content`), adresa je v `app.json` (`extra.apiBaseUrl`). Ověřeno: `/health`, HEAD, `Range`, 404 pro chybějící klíč i pokus o průchod cestou, SHA-256 staženého souboru shodný s originálem; release APK 1.3.1 (5) po `pm clear` stáhl mapu z produkce a vykreslil ji. Neověřeno: reálný telefon a iOS, vlastní doména místo `workers.dev`.
