# Import historie kroků z Google Takeout (Fit)

Stav: návrh, nic z toho zatím není implementováno ani ověřeno na reálném exportu.

## Proč

Na testovacím Androidu (Motorola edge 50 fusion) obsahuje Health Connect kroky jen od 18. 9. 2026 a jen ze zdroje „phone“. Google Fit na telefonu běží od 24. 3. 2026, ale do Health Connectu nezapisuje (nemá udělená oprávnění), takže starší historie je jen ve Fitu. Health Connect starší data zpětně nedoplňuje. Záložní cesta ze spec. 6.4 je proto import z exportu.

## Postup pro uživatele (k ověření)

Kroky vycházejí z obecné znalosti Google Takeout, ne z ověření na tomto účtu; názvy položek se mohou lišit.

1. Otevřít takeout.google.com, přihlásit se účtem, který používá Fit.
2. „Zrušit výběr všech“, vybrat jen **Fit**.
3. Ve volbách dat nechat denní metriky aktivity (kroky, vzdálenost). Podrobné aktivity (TCX) nejsou pro kroniku potřeba.
4. Export jednou, ZIP, stáhnout.
5. Rozbalit a najít složku s denními metrikami (soubory po dnech nebo po měsících).
6. Soubor(y) předat aplikaci, nebo, pro vývoj, Claudovi pro analýzu formátu.

Poznámka: služba Fit se ruší, takže dostupnost exportu a jeho obsah je nutné ověřit co nejdříve.

## Návrh implementace

- **packages/core**, čistý TS, bez React Native: parser denních metrik → `DailyRecord[]` (kroky přes `toDailyRecord`, tedy odhad; vzdálenost, pokud je v exportu, jako ověřená). Formát vstupu určíme z reálného exportu, ne odhadem.
- **Slučování s Health Connectem:** Takeout se bere jen pro dny **před nejstarším dnem z Health Connectu** (zde 2026‑09‑18), aby se kroky nezdvojily. Funkce `mergeSources(healthConnect, takeout)` s testy.
- **Aplikace:** výběr souboru (`expo-document-picker`, ověřit v dokumentaci SDK 58), zpracování na zařízení, data neopouštějí telefon.
- Úroveň důvěry: z Takeoutu „odhad“ u kroků, „ověřená“ u vzdálenosti; u ručně doplněných dnů „ručně zadaná“ (spec 6.2).

## Otevřené body

- Jaké přesně sloupce a jednotky denní metriky mají.
- Časové pásmo dne v exportu (lokální den podle zařízení při zápisu?).
- Zda Fit v exportu duplikuje kroky z více zdrojů (telefon + hodinky).
