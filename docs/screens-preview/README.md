# Náhled obrazovek aplikace

Snímky jsou z webového exportu (`react-native-web`) vyrenderované Chromiem v rozlišení 390×844. **Nejsou z telefonu**: vzhled na Androidu a iOS se může lišit (písma, stíny, bezpečné oblasti). Data jsou z ukázkového postupu (36 km, naposledy viděno 24,6 km), obsah míst je koncept.

| Soubor | Obrazovka |
|---|---|
| `domu-start.png` | Domů před spuštěním výpravy |
| `domu.png`, `domu-noc.png` | Domů s postupem, den a noc |
| `vyprava.png`, `vyprava-noc.png` | Výprava: náhled trasy bez podkladové mapy |
| `zastavka.png`, `zastavka-noc.png` | Detail zastávky z konceptu |

Srovnání s mockupy v `docs/mockupy`: rozložení Domů a Výprava odpovídá (další zastávka, „od posledně“, na dalších 5 km, spodní karta), ale chybí fotografie, podkladová mapa, medailony a textura pergamenu.

## Znovu vyrenderovat
```bash
cd apps/mobile
npx expo export --platform web --output-dir /tmp/footatlas-web
```
Pak otevřít `index.html` ze serveru se záložní stránkou (SPA) a v `localStorage` nastavit `footatlas.demo.v1` na `{"enabled":true,"walkedM":36000,"seenM":24600}`.

## Spuštění na Androidu
```bash
pnpm install
cd apps/mobile
npx expo run:android      # telefon připojený přes USB, ladění zapnuto
```
Ukázkový postup bez zdravotních dat: na Domů dole „Vývojářský panel“ (jen ve vývojovém buildu), „Zapnout ukázkový postup“.
