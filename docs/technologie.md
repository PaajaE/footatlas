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
- **Mapy**: primárně **Mapy.com API** (podklady Seznamu, pro ČR a střední Evropu nejlepší turistická/outdoorová kartografie; k dispozici i routing, geokódování a výškový profil). V aplikaci přes **MapLibre** s rastrovými dlaždicemi. Před zavedením ověřit v podmínkách služby a ceníku:
  - bezplatný limit a cena po jeho překročení (kredity za dlaždice a požadavky),
  - povinná atribuce (logo a copyright),
  - **zákaz nebo omezení cachování a offline použití dlaždic**. To ovlivňuje plán prodávat offline mapy jako placený doplněk (viz spec. 11.2),
  - jak chránit klíč v mobilní aplikaci: klíč v balíčku jde snadno vytáhnout, proto dlaždice a dotazy vést přes tenkou **Cloudflare Worker proxy** s limitem požadavků.
- **Záložní/doplňková varianta**: vlastní vektorové dlaždice formátem PMTiles (Protomaps, OpenStreetMap) na R2. Hodí se pro zahraniční výpravy mimo kvalitní pokrytí Mapy.com a pro legální offline mapy. Veřejné servery dlaždic OSM nejsou určené pro produkční provoz aplikace.
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

## 5. Zdroje tras: Stezka Českem a Via Czechia

Prověřeno 30. 10. 2026 na veřejných webech. Jde o technický podklad, ne o právní posouzení. Jsou to dva různé projekty, které se snadno zaměňují, protože obě stezky spojují nejzápadnější a nejvýchodnější bod ČR.

| | Stezka Českem | Via Czechia |
|---|---|---|
| Autor | kolektiv nadšenců ve spolupráci s KČT | Jan Hocek |
| Rozsah | severní a jižní větev, každá cca 1 000 km, po 10 etapách | šest stezek, přes 10 000 km (pěší Severní 1 058 km, Jižní 1 052 km) |
| GPX ke stažení | na webu nenalezeno; trasa jen jako sdílené odkazy na Mapy.cz a v placené aplikaci FarOut | ano, pod tabulkou u každé stezky na stránce Online mapy, aktualizace cca 1× ročně |
| Licence | nenalezena | web uvádí CC BY-NC-SA 4.0 (nejasné, zda platí i pro GPX) |
| OSM | relace nenalezena | trasy jsou v OSM (nahrál autor), licenční stránka v diskusi na talk-cz zůstala otevřená |
| Zdroj | stezkaceskem.cz | viaczechia.cz/online-mapy |

Závěry:
- **Via Czechia** je technicky nejschůdnější (GPX, zmapované etapy, itineráře). Doložka NC se neslučuje s placenými doplňky (spec. 11.2) a SA by vynutila stejnou licenci pro odvozená díla. Pro placenou aplikaci je nutné **písemné svolení autora**.
- **Stezka Českem** nemá dohledatelná data ani licenci, bez souhlasu autorů nic nepoužívat. Název a značku používat jen po domluvě.
- OSM není obejití licence: u Via Czechia je licenční otázka otevřená. Vlastní trasu z OSM (ODbL, s atribucí) lze sestavit jako „zjednodušenou reprezentaci" (spec. 5.4), bez názvu a značky stezky.
- Ověřeno jen z webů. Stránky etap Stezky Českem a dotaz na OSM přes Overpass se nepodařilo načíst, doporučuji zkontrolovat ručně.

## 6. Navržené další kroky

1. Založit vývojářský projekt na Mapy.com a ověřit podmínky (limity, atribuce, cachování).
2. Založit monorepo (pnpm, Expo dev client, `packages/core`).
3. Prototyp `HealthSource` pro iOS a Android a import historie na reálných zařízeních, výstup = karta života.
4. Podat žádost o oprávnění k historii v Google Play (dlouhá doba schvalování).
5. Zod schéma obsahu výpravy a jedna pilotní výprava jako šablona.
6. Kontaktovat Jana Hocka (Via Czechia) a autory Stezky Českem kvůli povolení a licenci k trasám.

## 7. Otevřené body

- Jaké zařízení máte k dispozici pro testování (Android i iPhone, hodinky)?
- Apple Developer program (99 USD/rok) je nutný pro testování HealthKit na zařízení a pro vydání; Google Play (jednorázově 25 USD).
