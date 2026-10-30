# Technologie: srovnání a doporučení (návrh)

Stav: 30. 10. 2026 · Cíl: nízké náklady, TypeScript, moderní nástroje.
Poznámka: údaje o knihovnách a limitech tarifů vycházejí z mých znalostí a je nutné je před rozhodnutím ověřit v aktuální dokumentaci (zejména podpora Health Connect historie v konkrétních verzích knihoven).

## 1. Přístup k zdravotním datům (rozhodující kritérium)

Všechny varianty nakonec volají nativní API (HealthKit, Health Connect). Rozdíl je v tom, jak dobré a udržované jsou vazby.

| | React Native (Expo dev client) | Flutter | Kotlin Multiplatform |
|---|---|---|---|
| iOS HealthKit | komunitní knihovny (např. `react-native-health`, případně novější `@kingstinct/react-native-healthkit`) | balíček `health` | vlastní Swift/ObjC interop |
| Android Health Connect | `react-native-health-connect` | balíček `health` | přímo oficiální Kotlin SDK |
| Čtení historie (> 30 dní) | **ověřit**: nutné oprávnění `READ_HEALTH_DATA_HISTORY` | **ověřit** | přímo dostupné |
| Agregace (dedup telefon + hodinky) | HealthKit statistické dotazy; Health Connect `aggregate` | obvykle ano | ano |
| Vlastní nativní modul při mezeře | Expo Modules API (Swift/Kotlin), poměrně snadné | platform channels | nativní |
| Tvoje zkušenosti | **TypeScript, ano** | Dart, ne | Kotlin, ne |

Doporučení: **React Native + Expo (dev client, ne Expo Go)**. Pokud některá knihovna nepodporuje potřebnou funkci (typicky historie na Androidu nebo agregace), dopíšeme si malý nativní modul přes Expo Modules API. Zdravotní vrstvu schovat za vlastní rozhraní (`HealthSource`), aby šla vyměnit.

Prvním krokem prototypu je ověřit na reálných zařízeních: (a) délku historie z HealthKit, (b) historii z Health Connect s přiděleným oprávněním, (c) dedup při telefonu + hodinkách.

## 2. Rust

Pro UI a práci se zdravotními API tu přínos nemá. Možnosti, kdy dává smysl:

- **Sdílené jádro** (výpočty tras, statistik, pravidla započítávání) zkompilované do nativní knihovny přes UniFFI. Reálná výhoda by byla jen při velkém objemu výpočtů nebo sdílení kódu s jiným jazykem.
- **Cloudflare Workers ve Rustu (WASM).** Funguje, ale zvyšuje složitost, a pro tenký backend je TypeScript jednodušší.

Verdikt: pro MVP **ne**. Jádro (datový model, pravidla započítávání, výpočet postupu po trase) psát jako čistý TypeScript balíček bez závislosti na React Native, aby šel testovat samostatně a případně později přepsat.

## 3. Backend a náklady

Princip: aplikace funguje offline a data žijí na zařízení. Server slouží jen k doručení obsahu a volitelně k záloze.

- **Obsah výprav** jako statické balíčky (JSON + obrázky) na **Cloudflare R2** (bez poplatků za egress, velkorysý bezplatný tarif) nebo Pages. Verzovat, podepisovat, kešovat. Žádný server není potřeba.
- **Mapové dlaždice**: vlastní vektorové dlaždice formátem **PMTiles** (Protomaps, data OpenStreetMap) na R2 plus **MapLibre** v aplikaci. Veřejné servery dlaždic OSM nejsou určené pro produkční provoz aplikace. Offline mapy se pak dají nabídnout jako placený doplněk.
- **Cloudflare Workers + D1/KV**: jen pokud bude potřeba API (ověření nákupu, sdílení karet, volitelná synchronizace). V bezplatných limitech by MVP mělo vystačit; limity je nutné ověřit.
- **Supabase**: vhodný, až se zavede volitelný účet a synchronizace (Auth + Postgres + RLS). Bezplatný projekt se po týdnu nečinnosti pozastavuje a má malé limity, pro start je to v pořádku, pro produkci počítat s tarifem. Do MVP bych ho nezaváděl, abychom se vyhnuli správě zdravotních dat na serveru (GDPR).
- **Nákupy**: RevenueCat (bezplatně do určitého obratu) nebo přímo StoreKit a Play Billing.
- **Chyby a telemetrie**: Sentry (bez zdravotních dat, jen anonymně).

## 4. Další části zásobníku

- **Lokální databáze**: SQLite (`expo-sqlite` nebo `op-sqlite`) s migracemi, např. přes Drizzle. Kronika = časové řady po dnech s úrovní důvěry.
- **Stav a data**: jednoduchý store (Zustand) + TanStack Query pro stažení obsahu.
- **Monorepo**: pnpm workspaces. `apps/mobile`, `packages/core` (čistý TS), `packages/content` (schéma obsahu + validátor), `content/` (výpravy).
- **Validace obsahu**: Zod schéma pro místo (zdroje, licence, datum kontroly) spuštěné v CI, takže zastávka bez dvou zdrojů neprojde.
- **Testy**: Vitest pro jádro, Maestro nebo Detox pro E2E později.
- **CI**: GitHub Actions + EAS Build (bezplatný tarif má omezený počet buildů).

## 5. Navržené další kroky

1. Založit monorepo (pnpm, Expo dev client, `packages/core`).
2. Prototyp `HealthSource` pro iOS a Android a import historie na reálných zařízeních, výstup = karta života.
3. Podat žádost o oprávnění k historii v Google Play (dlouhá doba schvalování).
4. Zod schéma obsahu výpravy a jedna pilotní výprava jako šablona.

## 6. Otevřené body

- Jaké zařízení máte k dispozici pro testování (Android i iPhone, hodinky)?
- Apple Developer program (99 USD/rok) je nutný pro testování HealthKit na zařízení a pro vydání; Google Play (jednorázově 25 USD).
