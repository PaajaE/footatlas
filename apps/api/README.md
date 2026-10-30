# @footatlas/api

Tenký Cloudflare Worker. Drží API klíč Mapy.com na serveru a servíruje balíčky výprav z R2.

| Cesta | Účel |
|---|---|
| `GET /health` | kontrola |
| `GET /tiles/{basic,outdoor,winter,aerial}/{z}/{x}/{y}` | proxy dlaždic Mapy.com |
| `GET /content/{klíč}` | soubory z R2 (501, dokud není nastaven bucket) |

## Lokální spuštění
```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars   # doplňte klíč, soubor je v .gitignore
pnpm --filter @footatlas/api dev                   # naslouchá na 0.0.0.0:8787, dosažitelné z telefonu v LAN
```

## Nasazení (později)
```bash
cd apps/api
npx wrangler login
npx wrangler secret put MAPY_API_KEY
pnpm deploy
```

Ověřit u poskytovatele: přesný tvar URL a hlavičku s klíčem, podmínky cachování dlaždic a povinnou atribuci.
