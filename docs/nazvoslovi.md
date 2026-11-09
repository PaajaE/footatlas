# Názvosloví

Jednotné pojmy v textech aplikace (rozhodnutí 0029). Platí pro obrazovky, přístupnostní popisky, obsah v `packages/content` i pro věty skládané v kódu. Kdo přidává text, drží se této tabulky; kdo narazí na odchylku, opraví ji.

## Pojmy

| Pojem | Význam | Kde se používá | Čemu se vyhnout |
|---|---|---|---|
| **Výprava** | Celá trasa, např. Vltavská stezka. | Domů, Výprava, Objevovat, „Výprava dokončena“ | „trasa“ jako název celku, „cesta“ jako název celku |
| **Etapa** | Úsek výpravy, číslovaný římsky („Etapa II“). | Pruh etap, Sbírky („Etapy“), pohlednice, Výprava („Etapa II · 3 razítka z 12“) | „List“ jako synonymum etapy (viz níže), „úsek“ v nadpisech |
| **List** | Jen ozdobný titulek rámečku mapy při přehrání cesty („List I · Vltavská stezka“), vždy s římským číslem etapy. V textu se nepoužívá. | rámeček mapy (`AtlasFrame`) | „List II“ ve Sbírkách nebo na Výpravě, „Listy atlasu“ |
| **Místo** | Obecně cokoli na trase, co se dá odemknout. | „Další místo“, „23 z 39 míst“, kapitoly | „bod“, „lokace“ |
| **Zastávka** | Hlavní místo (fotka, příběh, vosková pečeť). | „Další zastávka“, detail místa | „hlavní bod“ |
| **Objev** | Menší místo (razítko). | „Další objev“, „Přibyly 2 objevy“, detail místa | „malý objev“, „bod“ |
| **Odemknout** | Dojít k místu; místo se tím odemkne. | „Nedávno odemčeno“, „Odemkli jste: …“, „Odemčeno 3. 11.“ | „dosáhnout“, „objevit“ (jako sloveso v UI), „minout“ |
| **Razítko** | Co dostanete za odemčené místo (u zastávky vosk, u objevu razítko). | Sbírky: „Razítka míst“, „Další razítko přibude za …“ | „pečeť místa“, „odznak“ |
| **Pečeť** | Znak dokončené etapy nebo uzavřené kapitoly. | Sbírky: „Pečeti kapitol“, pečeť etapy na pohlednici | „razítko kapitoly“, „odměna“ |
| **Dokončit etapu / výpravu** | Dojít na konec etapy nebo celé výpravy. | „Etapa dokončena“, „Dokončili jste 2. etapu“ | „uzavřít etapu“ |
| **Kapitola** | Příběh přes víc míst jedné výpravy. | Domů, Sbírky, `/kapitola/[id]` | „sbírka“, „série“ |
| **Uzavřít kapitolu** | Odemknout všechna místa kapitoly. | „Kapitola uzavřena“, „do uzavření Mostů a lávek“ | „dokončit kapitolu“ |
| **Od posledně přibylo X km** | Co se přehrává při návratu do aplikace: rozdíl od posledního otevření. | věta pod kartou návratu („Od posledně přibylo 11,4 km.“) | „Dnes jste ušli“, pokud číslo není součet za celý den |
| **Dnes** | Součet za celý dnešní den (ze zdravotních dat). | dlaždice „Dnes“ na Domů | používat pro rozdíl od posledního otevření |
| **Přehrát cestu** | Tlačítko přehrání návratu na mapě. | karta návratu (přejmenovává lokální relace v `ReturnCard`) | „Přehrát návrat“ |
| **Přehrát den** | Přehrání jednoho dne z Kroniky. | Kronika, Deník | — |
| **Hádanka** | Otázka u zamčeného místa se třemi možnostmi. | detail místa, Domů | „kvíz“, „otázka za body“ |
| **Tip** | Volba odpovědi na hádanku; dobrovolná, bez bodů. | „Tipnout si“, „Změnit tip“ | „Tipnout si odpověď“, „Odpovědět“ |
| **Do pohlednice** | Kolik zbývá do konce etapy, kde čeká pohlednice. | dlaždice na Domů: „Do pohlednice · 15,5 km · konec etapy“ | „Pohlednice: 12,1 km do konce etapy“ |
| **Pohlednice** | Karta z dokončené etapy nebo uzavřené kapitoly; dá se uložit do Kroniky a poslat. | `/pohlednice`, Sbírky | — |
| **Změřil telefon / dopočítali z kroků** | Odkud je vzdálenost: telefon ji změřil přesně, nebo známe jen kroky a násobíme délkou kroku. | karta života, Kronika (Rok) | „ověřeno“, „odhad z kroků“, „poctivě“ |

## Rozhodnutí k „Listu“

„List“ (list atlasu) v textu nahradila **Etapa**: ve Sbírkách („Etapy · Vltavská stezka“, „Etapa II“) i na Výpravě („Etapa II · 3 razítka z 12“). Slovo zůstává jen jako ozdobný titulek rámečku mapy (atlas má listy) a vždy s římským číslem, které je zároveň číslem etapy: „List III“ = etapa III. Jiný význam nemá.

## Etapa „dokončená“, kapitola „uzavřená“

Etapa a výprava se **dokončí** (dojdete na konec), kapitola se **uzavře** (posbíráte všechna místa). Obojí dostane pečeť.

## Kde ještě odchylky jsou

- `app/navrat.tsx`, `components/ReturnCard.tsx`, `components/HaltCard.tsx`, `src/navrat.ts`: nadpis karty návratu „Dnes jste ušli“, tlačítko „Přehrát návrat“ a „Malý objev“ na kartě zastavení. Tyto soubory přepisuje souběžná relace (rozhodnutí 0028), sjednotí je podle této tabulky.
- Komentáře a názvy v kódu (např. `discovery`, `stageStateLabel`) se nepřejmenovávají; tabulka platí pro texty, které člověk uvidí nebo uslyší.
