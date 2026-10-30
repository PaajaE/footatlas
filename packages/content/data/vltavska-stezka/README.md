# Vltavská stezka, pilotní výprava (koncept)

- `expedition.json`: obsah (38 míst: 10 zastávek, 28 malých objevů, 4 etapy). Stav `draft`.
- `route.json`: geometrie jako GeoJSON `LineString` (`[lon, lat]`), délka 62,02 km.

Původ: převedeno z `docs/mockupy/nastroje` (`mista.json`, `trasa.json`). Trasa je tok Vltavy z dat OpenStreetMap (ODbL), ne vyznačená stezka. Polohy míst jsou z mockupů přibližné; několik míst leží dál od řeky (nejvíc Klecany, ~2,8 km) a je nutné je ověřit. `unlockAtM` je vzdálenost od startu po trase, spočtená promítnutím místa na geometrii (`projectOnto`).

Texty nejsou ověřené, zdroje a fotky s licencí chybí. Před vydáním musí každé místo projít schématem `place` (spec 7.3).
