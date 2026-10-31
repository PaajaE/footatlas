# Kronika v SQLite (návrh)

Stav: 30. 10. 2026. **Implementována první část** (rozhodnutí 0007): tabulky `daily_motion`, `source_state`, `expedition_run` a `expedition_period` (stav rozjeté výpravy včetně převodu z AsyncStorage), synchronizace Health Connectu, přepočet po změně délky kroku a statistiky na záložce Kronika. Ostatní tabulky (`manual_entry`, `expedition_event`, `life_milestone`) a Životní cesta zůstávají návrhem. API `expo-sqlite` bylo ověřeno proti dokumentaci SDK 58 a na telefonu (otevření, migrace, `withExclusiveTransactionAsync`, `prepareAsync`). Odchylka od schématu níž: `daily_motion` má navíc sloupec `step_length_m` (délka kroku, se kterou se den spočítal; podle něj se pozná, který den je po změně délky kroku k přepočtu).

## Proč a co se ukládá

Dnes aplikace nic trvale neukládá kromě stavu výpravy (AsyncStorage, `footatlas.session.v1`). Kronika se při každém otevření čte znovu ze zdravotních dat. To nestačí, protože:

- **Health Connect zapomíná.** Bez oprávnění k historii vidí jen ~30 dní před prvním udělením; zdroj (např. Google Fit) může data smazat nebo přestat zapisovat. Co jednou přečteme, má zůstat v kronice (spec 12: data patří uživateli).
- **Importy jsou jednorázové.** Google Takeout (`docs/import-takeout.md`), GPX (`docs/import-gpx.md`) a ruční odhad nejdou znovu přečíst ze systému.
- **Pravidla se mění.** Rozhodnutí 0005 změnilo výběr mezi kroky a vzdáleností. Když uložíme **surové hodnoty** (kroky i vzdálenost zvlášť), přepočet je dotaz nad databází, ne nové čtení historie.
- **Obrazovka Kronika** potřebuje agregace přes roky (součty, nejdelší den, dny se záznamem) rychle a offline.

Co se neukládá: obsah výprav (je v balíčku `packages/content`), mapy, nic na server (spec 12, primárně na zařízení).

## Zásady

1. **Surová data + odvozená hodnota.** Řádek dne nese kroky, surovou vzdálenost od platformy a vybranou vzdálenost s úrovní důvěry a verzí pravidla. Pravidlo zůstává v `packages/core` (`toDailyRecord`, `toDailyRecordStepsFirst`), SQL ho neduplikuje.
2. **Zdroje vedle sebe, výběr až při čtení.** Každý zdroj (Health Connect, HealthKit, Takeout, ruční) má své řádky. Který zdroj pro daný den platí, rozhoduje jedna funkce v core, ne mazání dat.
3. **Výprava ukládá jen časové značky** (rozhodnutí 0004). Vzdálenost se dopočítává, uložený je jen poslední zobrazený stav a výsledek po dokončení.
4. **Čisté jádro.** `packages/core` nezná SQLite. Mezi aplikací a databází je rozhraní `ChronicleStore` v `apps/mobile/src/db`; testy jádra používají paměťovou implementaci.

## Schéma (verze 1)

```sql
-- Denní hodnoty po zdrojích. Jeden řádek = jeden lokální den z jednoho zdroje.
CREATE TABLE daily_motion (
  day            TEXT    NOT NULL,              -- lokální den YYYY-MM-DD
  source         TEXT    NOT NULL               -- odkud: zdravotní data, import
                 CHECK (source IN ('health_connect', 'healthkit', 'takeout', 'gpx')),
  steps          INTEGER,                       -- surový součet kroků, NULL = zdroj kroky nemá
  raw_distance_m REAL,                          -- surová vzdálenost od platformy, NULL = nemá
  distance_m     REAL    NOT NULL,              -- vybraná vzdálenost podle pravidla v core
  confidence     TEXT    NOT NULL CHECK (confidence IN ('verified', 'estimated')),
  rule_version   INTEGER NOT NULL,              -- verze pravidla, které vybralo distance_m
  read_at        TEXT    NOT NULL,              -- okamžik ISO posledního přečtení
  PRIMARY KEY (day, source)
) WITHOUT ROWID;

-- Ruční odhad (spec 6.2 „ručně zadaná“): orientační součet za období, ne za den.
CREATE TABLE manual_entry (
  id         INTEGER PRIMARY KEY,
  from_day   TEXT NOT NULL,
  to_day     TEXT NOT NULL CHECK (to_day >= from_day),
  distance_m REAL NOT NULL CHECK (distance_m >= 0),
  note       TEXT,
  created_at TEXT NOT NULL
);

-- Rozjeté a dokončené výpravy. Nahrazuje AsyncStorage `footatlas.session.v1`.
CREATE TABLE expedition_run (
  id                INTEGER PRIMARY KEY,
  expedition_id     TEXT NOT NULL,              -- id z packages/content
  content_version   TEXT,                       -- verze obsahu, se kterou se šlo
  status            TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
  last_seen_walked_m REAL NOT NULL DEFAULT 0,   -- pro „od posledně“
  final_walked_m    REAL,                       -- po dokončení nebo opuštění
  finished_at       TEXT                        -- okamžik ISO dokončení nebo opuštění
);
-- V MVP nejvýš jedna rozjetá výprava (spec 5.3).
CREATE UNIQUE INDEX one_running_run ON expedition_run (status) WHERE status IN ('active', 'paused');

-- Období, kdy výprava běžela (okamžiky ISO, rozhodnutí 0004).
CREATE TABLE expedition_period (
  run_id   INTEGER NOT NULL REFERENCES expedition_run (id) ON DELETE CASCADE,
  start_at TEXT    NOT NULL,
  end_at   TEXT,                                -- NULL = běží
  PRIMARY KEY (run_id, start_at)
) WITHOUT ROWID;

-- Co se na výpravě stalo: dosažená místa, dokončené etapy (spec 8: navštívená místa s datem).
CREATE TABLE expedition_event (
  run_id      INTEGER NOT NULL REFERENCES expedition_run (id) ON DELETE CASCADE,
  kind        TEXT    NOT NULL CHECK (kind IN ('place', 'stage', 'finish')),
  ref         TEXT    NOT NULL,                 -- id místa nebo číslo etapy
  at_m        REAL    NOT NULL,                 -- kilometr trasy v metrech
  reached_day TEXT    NOT NULL,                 -- lokální den, kdy součet přešel at_m
  noticed_at  TEXT    NOT NULL,                 -- kdy to aplikace zjistila (otevření)
  PRIMARY KEY (run_id, kind, ref)
) WITHOUT ROWID;

-- Milníky životní cesty (spec 5.2), aby se oslavily jen jednou.
CREATE TABLE life_milestone (
  id          TEXT PRIMARY KEY,                 -- např. 'segment:evropa:500km'
  reached_day TEXT NOT NULL,
  noticed_at  TEXT NOT NULL
) WITHOUT ROWID;

-- Stav čtení zdrojů: odkud číst příště, co bylo povoleno.
CREATE TABLE source_state (
  source           TEXT PRIMARY KEY,
  oldest_day       TEXT,                        -- nejstarší den, který zdroj vrátil
  last_read_at     TEXT,
  history_granted  INTEGER NOT NULL DEFAULT 0   -- Android READ_HEALTH_DATA_HISTORY
) WITHOUT ROWID;
```

Poznámky ke schématu:
- `day` je text YYYY-MM-DD: porovnává se lexikálně, seskupuje přes `substr(day, 1, 4)` (rok) a `substr(day, 1, 7)` (měsíc), bez potíží s časovými pásmy.
- Okamžiky jsou ISO 8601 v UTC (`toISOString()`), stejně jako v `ExpeditionSession`.
- `expedition_event.reached_day` počítá čistá funkce v core z denních záznamů a období (den, kdy kumulativní součet výpravy poprvé přešel `at_m`), ne okamžik otevření aplikace. Bez toho by „navštíveno 3. 11.“ znamenalo „otevřeno 3. 11.“.
- Primární klíč `(day, source)` dovolí zápis přes `INSERT … ON CONFLICT (day, source) DO UPDATE`, takže opakované čtení posledních dnů (pozdní synchronizace hodinek) data přepíše, ne zdvojí.
- `WITHOUT ROWID` u tabulek s přirozeným klíčem šetří místo; desítky let po dnech jsou i tak jen desítky tisíc řádků.

## Výběr zdroje pro den

Čistá funkce v core, testovaná bez databáze:

```ts
// packages/core (návrh)
type SourceId = "health_connect" | "healthkit" | "takeout" | "gpx";
function chronicleDays(rows: StoredDay[]): DailyRecord[];
```

Pravidla (návrh, navazuje na `docs/import-takeout.md`):
1. Systémový zdroj (Health Connect, HealthKit) má přednost.
2. Takeout jen pro dny **před** nejstarším dnem systémového zdroje, aby se kroky nezdvojily.
3. GPX výpravy nejsou kronika, ale trasa (`docs/import-gpx.md`); do `daily_motion` jen pokud se uživatel rozhodne je započítat.
4. Ruční odhad (`manual_entry`) se do dnů nerozpouští, v kronice je samostatná položka s úrovní „ručně zadaná“ a do životní cesty se přičte (spec 6.3).

Přepočet po změně pravidla: projít řádky s `rule_version < aktuální`, z `steps` a `raw_distance_m` znovu spočítat `distance_m` a `confidence`. Žádné nové čtení zdravotních dat.

## Synchronizace (při otevření aplikace, spec 6.4)

1. `source_state.last_read_at` → číst od `min(poslední den − 7 dní, dnes − 7 dní)` do teď. Sedm dní zpět kvůli pozdě synchronizovaným hodinkám a opravám zdrojů.
2. První import: celá historie (`readDaily(2000-01-01, teď)`, jako dnes v `ImportPrototype`), po rocích (`yearChunks`).
3. Zápis v jedné transakci, `INSERT … ON CONFLICT DO UPDATE`.
4. Dny, které zdroj přestal vracet, se **nemažou** (Health Connect po 30 dnech bez oprávnění k historii data „ztratí“, kronika ne).
5. Výprava: vzdálenost dál z `walkedInSlicesM` (rozhodnutí 0004); celé dny z `daily_motion`, části dne živě přes `readInterval`. Po dokončení se uloží `final_walked_m`, aby kronika výprav nezávisela na zdravotních datech.

## Obrazovka Kronika

Podle mockupu `docs/mockupy/Kronika.dc.html` (záložky Statistiky, Životní cesta, Výpravy) a spec 8. Všechny dotazy jdou nad pohledem vybraných dnů. V SQL ho lze udělat jako `VIEW`, ale protože výběr zdroje je v core, jednodušší je načíst `daily_motion` celé (tisíce řádků, jednotky ms) a agregovat v core. SQL agregace níže jsou pro případ, že by to bylo pomalé.

### Statistiky
| Prvek | Výpočet |
|---|---|
| „14 200 km celkem od roku 2016“ | součet všech dnů + ruční odhady; rok = nejstarší den |
| Sloupce po letech | `GROUP BY substr(day, 1, 4)` |
| „1 650 km letos do října“ | součet dnů s `day >= 'RRRR-01-01'` |
| „3 912 dní se záznamem“ | počet dnů se vzdáleností > 0 |
| „24 km nejdelší den“ | `MAX(distance_m)` a jeho den |
| Složení podle důvěry (spec 6.2) | `totals()` z core: ověřeno / odhad / ručně |
| Denní, týdenní, měsíční přehled (spec 8) | týdny po ISO týdnech v core, měsíce `substr(day, 1, 7)` |

Příklad pro sloupce po letech, kdyby se agregovalo v SQL:
```sql
SELECT substr(day, 1, 4) AS year, SUM(distance_m) AS m, COUNT(*) AS days
FROM daily_motion WHERE source IN ('health_connect', 'healthkit')
GROUP BY year ORDER BY year;
```

### Životní cesta
Součet všeho pohybu (včetně ručního odhadu) → segment a zbývající vzdálenost (spec 5.2). Výpočet segmentu v core. „Při vašem tempu zhruba za 19 měsíců“: průměr posledních 90 dní z `daily_motion`. Nově dosažené milníky se zapíšou do `life_milestone`.

### Výpravy
`expedition_run` + `expedition_event`: dokončené a opuštěné výpravy (spec 5.3: opuštěná se uloží jako nedokončená a jde obnovit), počet objevených míst, dny na cestě (`reached_day` prvního a posledního místa).

### Prázdné a částečné stavy
- Bez dat: „Kronika se plní od chvíle, kdy povolíte čtení“ + volby z onboardingu (import, ruční odhad).
- Krátká historie Health Connect: věta „Data máme od 18. 9. 2026. Starší historii můžete doplnit importem.“ (`source_state.oldest_day`).

## expo-sqlite v SDK 58 (z dokumentace, neověřeno na telefonu)

Stránka dokumentace se při čtení načetla jen zčásti. Signatury označené (*) pocházejí ze shrnutí, ne z doslovného textu, a před implementací je ověřit ve zdrojích balíčku.

- Instalace `npx expo install expo-sqlite`. Config plugin je potřeba jen pro SQLCipher, vlastní přepínače sestavení a sqlite-vec. Po přidání je nutný nový vývojový build (nativní modul).
- Otevření: `<SQLiteProvider databaseName="footatlas.db" onInit={migrateDbIfNeeded}>` v kořenovém `_layout.tsx`, v obrazovkách `useSQLiteContext()`. `onInit` doběhne před vykreslením potomků, takže je to správné místo pro migrace. Mimo React lze použít `openDatabaseAsync(name)`.
- Dotazy: `runAsync` (zápis, vrací `lastInsertRowId` a `changes`), `getFirstAsync`, `getAllAsync`, `getEachAsync`, `prepareAsync` (vždy `finalizeAsync` v `finally`) pro hromadné vkládání při importu. Parametry vždy přes `params`, ne skládáním řetězců (`execAsync` nic neescapuje).
- Transakce: pro import `withExclusiveTransactionAsync` (*), do které nevstoupí jiné dotazy. `withTransactionAsync` není exkluzivní a mohou se do ní připlést souběžné dotazy (např. čtení z obrazovky). Exkluzivní varianta podle shrnutí nefunguje na webu; webový náhled by měl jít přes `withTransactionAsync`.
- Při vytvoření nastavit `PRAGMA journal_mode = WAL` (doporučeno v dokumentaci) a `PRAGMA foreign_keys = ON` (kvůli `ON DELETE CASCADE`).
- Změny pro obrazovky: `enableChangeListener` v `SQLiteOpenOptions` a `addDatabaseChangeListener` (*). Pro MVP stačí obnovit data po synchronizaci ručně.
- Zálohy a export: `backupDatabaseAsync`, `serializeAsync` (*). Viz otevřené otázky.
- `expo-sqlite/kv-store` je náhrada za AsyncStorage, kdyby se mělo zbavit závislosti `@react-native-async-storage/async-storage`.
- Web: vyžaduje úpravu Metro pro WASM a hlavičky COOP/COEP. Webový náhled obrazovek (`docs/screens-preview`) by bez nich přestal fungovat, proto na webu nechat paměťovou implementaci `ChronicleStore`, podobně jako `health/index.web.ts`.
- Šifrování: SQLCipher přes config plugin (`useSQLCipher`) a `PRAGMA key`. Bez něj se klíč tiše ignoruje, ověřit přes `PRAGMA cipher_version`.

## Migrace

`PRAGMA user_version` jako číslo verze schématu (postup podle příkladu v dokumentaci), migrace jako pole SQL řetězců v `apps/mobile/src/db/migrations.ts`, spouštěné při startu v jedné transakci. Verze 1 navíc přenese stav výpravy z AsyncStorage (`parseSession` zvládá i starý formát po dnech) a klíč pak smaže.

Drizzle (zmíněný v `docs/technologie.md`): pro MVP **zatím ne**. Tabulek je sedm, dotazy jednoduché a pravidla jsou v core; ORM a jeho generátor migrací by přidaly závislost bez velkého přínosu. Přehodnotit, pokud schéma poroste.

## Testování

- Pravidla (výběr zdroje, přepočet, `reached_day`, segmenty) jako čisté funkce v core, Vitest.
- SQL migrace a dotazy: v Node přes vestavěný `node:sqlite` (NEOVĚŘENO, zda verze Node v CI nevyžaduje přepínač) nad stejnými řetězci migrací. Tím se ověří syntaxe a dotazy bez telefonu.
- Na telefonu NEOVĚŘENO: rychlost prvního importu (u testovacího telefonu jen ~6 týdnů, ale u iPhonu s historií od roku 2016 přes 3 900 dní), velikost databáze, chování při přerušení importu.

## Otevřené otázky

- Zálohy a export (spec 12: CSV, PDF, GPX). CSV z `daily_motion` je jednoduchý; zda zálohovat celý soubor databáze a kam (bez účtu jen do souborů telefonu).
- Časová pásma u dnů z různých zdrojů (Health Connect dělí dny podle pásma záznamu, Takeout neznámo).
- Zda ukládat i hodinové hodnoty pro přesnější den zahájení výpravy bez `readInterval` (iOS). Návrh: ne, zbytečně velké.
- Šifrování databáze: zdravotní data jsou zvláštní kategorie (spec 12). Na zařízení chrání sandbox aplikace a šifrování telefonu; vlastní šifrování (SQLCipher) zatím ne, rozhodnout před vydáním.
