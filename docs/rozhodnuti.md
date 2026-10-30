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
