# Názvosloví

Jednotné pojmy v textech aplikace (rozhodnutí 0029). Platí pro obrazovky, přístupnostní popisky, obsah v `packages/content` i pro věty skládané v kódu. Kdo přidává text, drží se této tabulky; kdo narazí na odchylku, opraví ji.

## Pojmy

| Pojem | Význam | Kde se používá | Čemu se vyhnout |
|---|---|---|---|
| **Výprava** | Celá trasa, např. Vltavská stezka. | Domů, Výprava, Objevovat, „Výprava dokončena“ | „trasa“ jako název celku, „cesta“ jako název celku |
| **Etapa** | Úsek výpravy, číslovaný římsky („Etapa II“). | Pruh etap, Sbírky („Etapy“), pohlednice, Výprava („Etapa II · 3 razítka z 12“) | „List“ jako synonymum etapy (viz níže), „úsek“ v nadpisech |
| **List** | Nepoužívá se. Rámeček mapy při přehrání cesty píše „Etapa III · Vltavská stezka“ (rozhodnutí 0028). | — | „List II“ kdekoli v aplikaci, „Listy atlasu“ |
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
| **Přehrát cestu** | Tlačítko přehrání návratu na mapě. | karta návratu (`ReturnCard`) | „Přehrát návrat“ |
| **Přehrát den** | Přehrání jednoho dne z Kroniky. | Kronika, Deník | — |
| **Hádanka** | Otázka u zamčeného místa se třemi možnostmi. | detail místa, Domů | „kvíz“, „otázka za body“ |
| **Tip** | Volba odpovědi na hádanku; dobrovolná, bez bodů. | „Tipnout si“, „Změnit tip“ | „Tipnout si odpověď“, „Odpovědět“ |
| **Do pohlednice** | Kolik zbývá do konce etapy, kde čeká pohlednice. | dlaždice na Domů: „Do pohlednice · 15,5 km · konec etapy“ | „Pohlednice: 12,1 km do konce etapy“ |
| **Pohlednice** | Karta z dokončené etapy nebo uzavřené kapitoly; dá se uložit do Kroniky a poslat. | `/pohlednice`, Sbírky | — |
| **Změřil telefon / dopočítali z kroků** | Odkud je vzdálenost: telefon ji změřil přesně, nebo známe jen kroky a násobíme délkou kroku. | karta života, Kronika (Rok) | „ověřeno“, „odhad z kroků“, „poctivě“ |

## Rozhodnutí k „Listu“

„List“ (list atlasu) všude nahradila **Etapa**: ve Sbírkách („Etapy · Vltavská stezka“, „Etapa II“), na Výpravě („Etapa II · 3 razítka z 12“) i v rámečku mapy při přehrání cesty („Etapa III · Vltavská stezka“, rozhodnutí 0028). Dvě slova pro jednu věc chodce jen mátla.

## Kde ještě odchylky jsou

Žádné známé. Přehrání cesty (`navrat.tsx`, `ReturnCard`, `HaltCard`) je sjednocené v rozhodnutí 0028: „Od posledně přibylo“, „Přehrát cestu“, „Objev“, „Odemkli jste“, „Přeskočit“, „Na obzoru“.

## Doplnění z návrhu v2

Pojmy Mezitím, Před vámi, Atlas, Téma a Symbol a slova, která se přestávají používat (Domů, Dnes jako název obrazovky, Objevovat, Kam dnes dojdu), jsou v [navrh-v2.md](navrh-v2.md) § 9.
