# @footatlas/api

Tenký Cloudflare Worker. Servíruje soubory z R2 (mapy a balíčky výprav) a drží API klíč Mapy.com na serveru.

| Cesta | Účel |
|---|---|
| `GET /health` | kontrola |
| `GET`/`HEAD /content/{klíč}` | soubory z R2 bucketu `footatlas-content` (Range, ETag; `maps/*` se kešuje navždy, název nese otisk obsahu) |
| `GET /tiles/{basic,outdoor,winter,aerial}/{z}/{x}/{y}` | proxy dlaždic Mapy.com (volitelný podklad, potřebuje `MAPY_API_KEY`) |

## Lokální spuštění
```bash
cd apps/api
npx wrangler r2 object put footatlas-content/maps/<název>.pmtiles --file <soubor> --local   # lokální simulace R2
npx wrangler dev --ip 0.0.0.0 --port 8788                                                  # telefon / emulátor: http://10.0.2.2:8788
```
Pro `/tiles` doplňte klíč: `cp .dev.vars.example .dev.vars` (soubor je v `.gitignore`).

## Nasazení
```bash
cd apps/api
npx wrangler login
npx wrangler deploy          # Worker footatlas-api + vazba na bucket footatlas-content
npx wrangler secret put MAPY_API_KEY   # jen pokud se použije proxy Mapy.com
```
Nahrání mapy do R2 a přepsání odkazu v aplikaci: `tools/maps/publish.sh` (rozhodnutí 0013). Adresu nasazeného Workeru vložte do `apps/mobile/app.json` (`extra.apiBaseUrl`).

Ověřit u poskytovatele Mapy.com: přesný tvar URL a hlavičku s klíčem, podmínky cachování dlaždic a povinnou atribuci.
