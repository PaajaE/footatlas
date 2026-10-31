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
