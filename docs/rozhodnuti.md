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
