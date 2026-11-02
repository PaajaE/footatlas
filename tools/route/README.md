# Pěší trasa Vltavské stezky

`build-walking-route.mjs` sestaví `packages/content/data/vltavska-stezka/route.json` z ručně vybraných bodů (pole `WAYPOINTS_RAW` ve skriptu, s komentáři) pomocí veřejného OSRM s pěším profilem:

```
https://routing.openstreetmap.de/routed-foot/route/v1/foot/{lon,lat;lon,lat;...}?overview=full&geometries=geojson&continue_straight=true
```

Data © přispěvatelé OpenStreetMap (ODbL). Skript posílá jediný požadavek (při chybě opakuje s prodlužující se prodlevou).

## Použití

```
node tools/route/build-walking-route.mjs        # zapíše route.json a v expedition.json upraví jen totalM, stageEndsM, unlockAtM a routeSource
DRY=1 node tools/route/build-walking-route.mjs  # jen report, nic se nezapíše
```

Volitelně: `OSRM_CACHE=adresář` (ukládá odpovědi), `PROFILE=1` (vzdálenost trasy od řeky po 1,5 km), `OLD_REF=git-ref` (commit se starou trasou pro kontrolu koridoru, výchozí `4e3b856`).

## Co skript vypíše

- úseky mezi body: vzdálenost po cestě, vzdušná čára a poměr (cíl je do 1,6; výjimky níže),
- zpětné úseky (trasa se vrací po stejné cestě),
- `unlockAtM` a kolmou odchylku každého místa; místa se promítají v pořadí výpravy (okno začíná 300 m před předchozím místem),
- etapy: 4, každá končí zastávkou, poslední v cíli; zastávky se vybírají tak, aby největší etapa byla co nejkratší,
- největší vzdálenost nové trasy od staré čáry (koridor mapových dlaždic).

Místa na druhém břehu nejsou body trasy, jen se promítnou. Hustotu míst (`densityReport`) kontroluje `packages/content/src/pilot.test.ts`.

## Úseky nad poměr 1,6 (vysvětlení)

- Trojská lávka -> Trojský zámek (1,62): krátký úsek přes lávku na Císařský ostrov, 0,75 km.
- Levý Hradec -> Skály u Řeže -> Libčice (1,73 a 1,76; dohromady 7,7 km proti 4,2 km vzdušně): pěší cesta obchází meandr u Řeže a Husince a stoupá z údolí do Libčic.
- Červený mlýn -> Vraňany (1,81, 9,6 km): na druhý břeh k plavebnímu kanálu vede trasa přes přívoz v Lužci, protože blíž přechod není.

## Omezení

Trasa je spočítaná, ne ověřená v terénu. Přívozy (Podbaba, Libčice – Dolany, Lužec) jezdí sezónně a OSRM s tím nepočítá; před vydáním je nutné trasu projít.
