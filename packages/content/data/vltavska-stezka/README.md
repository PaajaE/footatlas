# Vltavská stezka, pilotní výprava (koncept)

- `expedition.json`: obsah (38 míst: 10 zastávek, 28 malých objevů, 4 etapy). Stav `draft`.
- `route.json`: geometrie jako GeoJSON `LineString` (`[lon, lat]`), délka 62,25 km (62 254 m).

Původ: místa převedena z `docs/mockupy/nastroje` (`mista.json`). Trasa je **pěší trasa po souši** (nábřeží, cesty a cyklostezky podél Vltavy, přívozy a mosty tam, kde jsou), ne tok řeky. Vypočítal ji pěší routing OSRM (`routing.openstreetmap.de`, profil foot) nad daty OpenStreetMap (ODbL, © přispěvatelé OpenStreetMap), zjednodušila se Douglasem–Peuckerem (8 m) a zaokrouhlila na 5 desetinných míst. Není to vyznačená stezka.

## Etapy

| Etapa | Konec (zastávka) | Konec v m | Délka |
| --- | --- | --- | --- |
| 1 | Zámek Roztoky | 16 745 | 16,75 km |
| 2 | Kralupy nad Vltavou | 33 726 | 16,98 km |
| 3 | Plavební kanál Vraňany | 51 486 | 17,76 km |
| 4 | Soutok v Mělníku | 62 254 | 10,77 km |

## Místa a trasa

`unlockAtM` je vzdálenost od startu po trase, spočtená promítnutím místa na geometrii (v pořadí výpravy, monotónně). Část míst leží na druhém břehu nebo dál od cesty a jsou to „výhledy přes řeku“; ta se na trasu jen promítají (kolmá odchylka přes 500 m: Libeňský most, Klecanské hradiště, Husinec, Lužní les, Vepřek, Slepé rameno, Říční tůně, První pohled na Mělník, Zámek Hořín).

Mapové dlaždice pokrývají koridor kolem staré čáry (toku řeky). Nová trasa se od ní vzdaluje nejvýš o ~1,5 km (u Vraňan a Lužce), takže koridor stačí.

## Jak trasu znovu spočítat

```
node tools/route/build-walking-route.mjs        # zapíše route.json a upraví totalM, stageEndsM, unlockAtM, routeSource
DRY=1 node tools/route/build-walking-route.mjs  # jen vypíše report
```

Podrobnosti jsou v `tools/route/README.md`. Texty nejsou ověřené, zdroje a fotky s licencí chybí. Před vydáním musí každé místo projít schématem `place` (spec 7.3).
