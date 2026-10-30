# Specifikace produktu: Cestovatelská aplikace (pracovní název)

Verze 0.4 · 30. 10. 2026 · Navazuje na původní vizi (v0.1), konkurenční analýzu a testování konkurenčních aplikací

**Změny oproti v0.3:** zvýšena hustota míst na trase podle mockupů (7.2, 7.6, 9.2, 9.3): místo v průměru každých 1,5–2 km, zastávky po 5–10 km.

**Změny oproti v0.2:** opraven příklad karty života (číselný nesoulad), sjednocena hustota obsahu s odhadem náročnosti (7.2 × 7.6), doplněno riziko schválení oprávnění k historii v Google Play, otevřená otázka zálohy a přenosu dat bez účtu a upřesněna volba technologie (viz `docs/technologie.md`).

## 1. Shrnutí

Mobilní aplikace, která proměňuje skutečný pohyb uživatele (kroky, vzdálenost) ve virtuální výpravy po světě a zároveň z něj vytváří dlouhodobou osobní kroniku pohybu. Důraz je na geografii, historii, mapu a příběh. Není to fitness aplikace a nikoho nenutí chodit.

**Hlavní slib uživateli:** „Vaše kroky mají smysl. Ukážeme vám, kam jste za život došli, a vezmeme vás dál.“

**Tři pilíře produktu:**

1. **Osobní kronika** – celoživotní historie pohybu včetně dat před instalací, statistiky, milníky.
2. **Výpravy** – krátké cesty s etapami, zajímavými místy a ověřenými fakty, které vždy začínají od nuly.
3. **Zážitek zdarma** – plně použitelná a zajímavá aplikace bez placení; platí se jen za „víc“.

## 2. Poziciování a konkurence

### 2.1 Co na trhu je

- **The Conqueror Challenges** – trasy s fyzickými medailemi, placený model. Velká uživatelská základna, silné značky, ale prakticky nic zdarma.
- **Walk the Distance** – skutečné trasy (Appalachian Trail, PCT, Camino aj.), synchronizace se zdravotními daty. Zdarma jen malý vzorek procházek, bez statistik. Zastávky jsou jen obrázek a odkaz na Wikipedii.
- **Walk the World: Virtual Trails** – pozitivní filozofie bez sérií, pas se razítky, poštovní karty. Trasa je ale dlouhá, na mapě se „nic neděje“, bez statistik, chybí důvod se vracet.
- **MistyWay** – fantasy RPG postup; v bezplatné verzi omezení kroků.
- **Další:** Pacer, World Walking (stovky bezplatných tras, bez příběhové vrstvy), Virtual Walking: Step Tracker, firemní výzvy typu Big Team Challenge.

### 2.2 Zjištění z testování (uživatelský dojem)

- Zdarma buď **není skoro nic**, nebo je zážitek **plochý** (dlouhá trasa, nic se neděje).
- **Statistiky a osobní historie chybí** v bezplatných verzích testovaných aplikací.
- **Zastávky jsou prázdné**: obrázek, případně odkaz na wiki.
- **Mapa neříká dost**: málo zastávek, málo událostí, „ostatní chodci“ nepřidávají hodnotu.
- Není jasné, **proč se vracet**.

### 2.3 Naše mezera a odlišení

1. **Opravdu zajímavý zážitek zdarma**, placení až za rozšíření.
2. **Retroaktivní celoživotní historie** a osobní kronika se statistikami zdarma.
3. **Obsah zastávek vlastní a ověřený** (text, překvapivý fakt, foto, zdroje), ne odkaz na Wikipedii.
4. **Hustota událostí na trase**: pořád se něco objevuje.
5. **Důvěra**: poctivé označení typů tras, data na zařízení, export, žádný nátlak.

*Pozn.: Hodnocení konkurence vychází z veřejných popisů a z orientačního vyzkoušení bezplatných částí. Placený obsah konkurence nebyl hodnocen.*

## 3. Cílová skupina

Původní „široká veřejnost“ zužujeme na výchozí jádro pro MVP:

- Lidé zhruba 30+, kteří chodí pravidelně a mají **dlouhou historii** v Apple Health nebo Health Connectu (telefon, hodinky, Garmin).
- Zajímají se o **geografii, historii, přírodu, mapy**.
- Chtějí **dlouhodobý přehled**, ne denní výkon.
- Odmítají nátlak, série a soutěžení.

Druhotně: lidé s omezenou mobilitou nebo při rehabilitaci, kterým vyhovuje vlastní tempo (aktivity musí jít nastavit široce).

**První trh:** Česko/střední Evropa (silné lokální trasy, méně konkurence), ale s angličtinou od začátku.

## 4. Principy produktu (revidované)

1. **Pohyb je zdroj dat, ne povinnost.** Žádné série, tresty ani agresivní notifikace.
2. **Osobní historie je oddělená od výprav.** Nová výprava vždy začíná od nuly.
3. **Životní cesta využívá celou historii**, i před instalací.
4. **Každé otevření aplikace něco dá.** Uživatel vždy vidí, co se od minule změnilo, a co ho čeká.
5. **Hustota událostí.** Na trase se děje něco zajímavého v krátkých odstupech.
6. **Fakta musí být důvěryhodná.** Zjednodušené a symbolické trasy jsou jasně označené. Každé tvrzení má zdroj.
7. **Zdarma je plný zážitek.** Platí se za další obsah a doplňky, nikdy za základní počítání, vlastní data ani dokončení rozjeté výpravy.
8. **Uživatel postupuje vlastním tempem.** Žádné termíny.
9. **Data patří uživateli.** Zpracování na zařízení, export kdykoli.
10. **Obsah je rozšiřitelný** bez zásadních změn produktu.

## 5. Dvě vrstvy a dva typy cest

### 5.1 Terminologie (aby se pojmy nepletly)

- **Kronika** – celá osobní historie pohybu a statistiky.
- **Životní cesta** – dlouhodobá vizualizace celoživotního pohybu (dříve „Life Journey“).
- **Výprava** – krátkodobá cesta s vlastním začátkem, koncem a etapami (dříve „Adventure“).
- Název „Journey“ v navigaci se **nepoužívá** pro obojí.

### 5.2 Životní cesta

- Využívá celkovou historii včetně dat před instalací.
- **Rozdělena do segmentů** (např. kontinenty nebo velké regiony) s vlastními milníky a odznaky, aby první milník přišel v řádu týdnů až měsíců, ne let.
- Kalibrace: alespoň jeden velký cíl má být pro průměrného uživatele dosažitelný zhruba za 5–10 let. Cesta kolem Země (40 075 km) a hlavně cesta na Měsíc (384 400 km) jsou pro průměrného chodce dlouhodobé až symbolické. Měsíc proto není hlavní příklad, jen volitelná symbolická cesta.
- Po dokončení: „další kolo“ nebo nový svět bez resetu historie.
- Žádné pevné termíny ani denní cíle.

### 5.3 Výpravy

- Začínají **vždy od nuly**; historické kroky se nezapočítávají.
- V základní verzi **jedna aktivní výprava** vedle životní cesty.
- Po dokončení se uloží do kroniky.
- **Pozastavení a opuštění**: výprava lze pozastavit kdykoli bez ztráty postupu; opuštěná se uloží jako nedokončená a lze ji obnovit.
- Souběžné výpravy jsou pozdější rozšíření. Pokud přijdou, započítání stejných kroků do více výprav musí být jasně odlišeno od skutečně ušlé vzdálenosti.

### 5.4 Typy tras (transparentní označení)

- Skutečná geografická nebo pěší trasa
- Zjednodušená reprezentace skutečné trasy
- Vlastní virtuální trasa propojující zajímavá místa
- Symbolická cesta (např. Měsíc)

Každá trasa nese viditelný štítek svého typu. Fikce je samostatná kategorie a v MVP se nepoužívá.

## 6. Práce s pohybovými daty

### 6.1 Zdroje

- Jediný zdroj pravdy jsou **systémová zdravotní data** (Apple Health, na Androidu Health Connect). Aplikace nemá vlastní krokoměr.
- **Preferuje se vzdálenost** před kroky, pokud ji zdroj nabízí. Kroky přepočtené délkou kroku jsou záložní odhad a jsou jako odhad označené.
- Duplicity (telefon + hodinky) se řeší agregovanými dotazy platformy, ne vlastním sčítáním.

### 6.2 Úrovně důvěry dat

Každý záznam v kronice má jednu z úrovní, viditelně odlišenou:

1. **Ověřená** – přímo ze zdravotních dat.
2. **Odhad** – přepočet z kroků nebo doplněné hodnoty.
3. **Ručně zadaná** – orientační součet zadaný uživatelem.

Statistiky vždy ukazují, z jakých úrovní se skládají.

### 6.3 Pravidla započítávání

- Kronika: veškerý zaznamenaný pohyb.
- Životní cesta: veškerý pohyb včetně historie a ručně zadaných hodnot (označených).
- Výprava: jen pohyb **po okamžiku zahájení**.
- Nastavitelné aktivity: chůze a běh jako výchozí; další (kolo, vozík, plavání) volitelně a bez omezení vyjádřené vzdáleností.

### 6.4 Platformy

- **Android a iOS se vyvíjejí paralelně** z jedné společné kódové základny (cross-platform), aby Android nebyl dohánějící verzí. Vývoj a každodenní testování běží na Androidu, iOS se průběžně ověřuje na testovacím zařízení.
- **iOS:** HealthKit nabízí historii za celou dobu, kdy telefon nebo hodinky data zapisovaly.
- **Android:** Health Connect ve výchozím stavu čte jen posledních 30 dní před prvním udělením oprávnění. Starší data vyžadují zvláštní oprávnění ke čtení historie, které musí uživatel výslovně udělit. Historie je navíc jen tak dlouhá, jak dlouho do Health Connectu zdroje (např. Google Fit, Samsung Health, Garmin) zapisovaly. To je třeba ověřit na reálných zařízeních.
- **Čtení na Androidu** probíhá standardně v popředí; čtení na pozadí vyžaduje další oprávnění. Aplikace proto data synchronizuje při otevření.
- **Záložní cesta:** ruční zadání odhadu a import z exportu (Garmin, Google Takeout) je plnohodnotná volba v onboardingu na obou platformách.

### 6.5 Co se nedělá

Žádné žebříčky ani porovnávání uživatelů, proto není nutná ochrana proti podvádění kroků.

## 7. Struktura výpravy a obsah

### 7.1 Základ výpravy

- Název, krátký popis, typ trasy, celková vzdálenost, mapa, počet etap, obtížnost.
- **Etapy** odpovídají zhruba 15–25 km, tedy přibližně týdenní jednotce při běžné chůzi.
- Milníky: dosažení místa, konec etapy, celé výpravy, překonání vzdálenosti.

### 7.2 Hustota událostí

- **Malý objev** (mikro-místo): zhruba každé 1–3 km. Krátká věta, foto nebo ilustrace jsou volitelné.
- **Zastávka** (plné místo): zhruba každých 5–10 km a na konci etap. Plný obsah podle šablony.
- **Cíl hustoty:** v průměru jedno místo (zastávka nebo objev) každých 1,5–2 km. Mezera mezi dvěma místy nemá přesáhnout 4 km, aby i krátká procházka něco přinesla.
- **První objev** do 1 km od startu, aby první den něco přinesl.
- **Výhled dopředu:** aplikace vždy ukazuje, kolik míst čeká na dalších 5 km.

### 7.3 Šablona zastávky

Každé plné místo má stejnou strukturu:

- Název, souřadnice, typ (zastávka / malý objev)
- 2–3 věty vlastního textu
- **Jeden překvapivý fakt**
- Fotografie nebo ilustrace včetně autora a licence
- Minimálně dva nezávislé zdroje
- Datum poslední kontroly faktů
- Podmínka odemčení (vzdálenost od startu)
- Vazba na tematickou kapitolu

### 7.4 Úrovně obsahu

1. Zajímavosti (kratší info o místě)
2. Tematické kapitoly (propojení více míst)
3. Rozšířený příběh – **až po MVP**, kandidát na placený obsah

### 7.5 Práva a licence

- Preferované zdroje: vlastní fotky, Wikimedia Commons, OpenStreetMap (nutno dodržet atribuci a licenční podmínky).
- Atribuce se ukládá přímo v datech místa.
- Fact-check: dva zdroje na tvrzení, datum kontroly.

### 7.6 Odhad náročnosti

Výprava o 80 km vyžaduje zhruba 11–16 plných zastávek (po 5–10 km plus konce etap) a 35–45 malých objevů (po 1–3 km), celkem asi 50 míst. Ukázková Vltavská stezka v mockupech má na 62 km 9 zastávek a 29 malých objevů. Malé objevy jsou levnější (jedna věta, jeden zdroj, foto nepovinné), proto hustotu nesou hlavně ony. Hustotu bude potřeba ověřit na pilotní výpravě; pokud by byl objem obsahu neúnosný, rozšiřuje se spíš rozestup malých objevů než počet zastávek. Obsah je hlavní úzké hrdlo celého projektu, proto je MVP omezeno na dvě výpravy.

## 8. Navigace a obrazovky

Čtyři záložky:

- **Domů** – dnešní postup, co se změnilo od minule, další zastávka a vzdálenost k ní, poslední objevy.
- **Výprava** – mapa jako hlavní obrazovka, etapy, místa.
- **Objevovat** – knihovna výprav, výběr další cesty.
- **Kronika** – statistiky, historie, dokončené výpravy, **Životní cesta**.

**Mapa** ukazuje: ušlý úsek, aktuální polohu, další zastávku se vzdáleností, navštívená místa s datem, krajinu před vámi. Ostatní chodci na mapě se nezobrazují.

**Statistiky** (zdarma): celkový počet kroků a vzdálenost, denní/týdenní/měsíční/roční přehledy, vývoj v čase, dokončené výpravy a etapy, navštívená místa, osobní milníky.

## 9. První týden uživatele

Cíl: do sedmi dnů uživatel zažije import své historie, první objev, dokončení etapy a pochopí, proč se vracet.

### 9.1 První minuty (onboarding)

1. **Úvod** – jedna obrazovka, jedna věta vize, bez registrace.
2. **Historie** – tři volby: *Načíst historii ze zdravotních dat* (doporučeno), *Začít od nuly*, *Zadat odhad ručně*. U načtení se jasně vysvětlí, proč a co se čte. Při odmítnutí oprávnění se nabídne ruční zadání. Na Androidu jde o dvě oprávnění: čtení dat a čtení historie starší než 30 dní.
3. **Karta života (první „wow“)** – výsledek importu: „Za život jste ušli 14 200 km. To je z Prahy do Tokia (asi 9 100 km) a ještě dalších 5 000 km navíc.“ Srovnání se počítá z tabulky vzdáleností měst v aplikaci, aby čísla vždy seděla. Karta se dá sdílet jako obrázek.
4. **První výprava** – tři doporučené krátké výpravy (50–100 km), každá s mapou, délkou a odhadem doby. Uživatel jednu zvolí a spustí.
5. **Domů** – první obrazovka ukazuje start, další zastávku a vzdálenost k ní.

Notifikace se v onboardingu **nežádají**.

### 9.2 Den 1

- Kroky od zahájení se započítají. První objev je blízko (do 1 km), takže první den obvykle přinese první odměnu.
- Při odemčení krátká animace na mapě, malý příběh, uložení do deníku.
- Žádný push, jen přehled při otevření aplikace.

### 9.3 Dny 2–3

- Při každém otevření **Domů** odpoví: „Od posledně jste ušli X km, minuli jste Y, do další zastávky zbývá Z km.“
- Malé objevy každých 1–3 km udržují pocit pohybu.
- Při prvním plném místě je odemčena první tematická kapitola.
- Pokud uživatel aplikaci neotevře, nic se neděje. Při návratu: „Vítejte zpět. Mezitím jste došli k…“.

### 9.4 Dny 4–6

- První **konec etapy** (zhruba 15–25 km): milník, „pohlednice“ z etapy, přehled etapy (kilometry, objevená místa, dny).
- Teprve tady se nabídne **volitelné zapnutí upozornění** na události (dosažení místa, konec etapy) a týdenní shrnutí. Výchozí stav je vypnuto.

### 9.5 Den 7

- **Týdenní shrnutí** v aplikaci (a volitelně jako upozornění): kolik jste ušli, co jste objevili, kde jste, co je na další etapě.
- Nabídka sdílení pohlednice nebo karty života.
- Připomenutí, že historie a statistiky jsou v Kronice.

### 9.6 Po prvním týdnu

- Dokončení první výpravy je očekáváno do 2–3 týdnů při běžné chůzi.
- Po dokončení: odznak, pohlednice, uložení do kroniky, nabídka další výpravy (jedna zdarma, další jako balíček).

### 9.7 Úspěch prvního týdne

- Dokončený import historie nebo vědomá volba jiné možnosti
- První objev do 48 hodin od startu
- Návrat v den 3 a v den 7
- Dokončená první etapa
- Aplikace nikdy neposlala nechtěnou notifikaci

## 10. Retence bez tlaku

- Jedna věc pro každé otevření: „co se změnilo“.
- **Odměna za návrat, ne za pravidelnost.**
- Týdenní shrnutí místo denních upozornění.
- Upozornění **jen na události** a jen na výslovný souhlas.
- Odemčená místa ukazují datum a kontext vlastní historie („tehdy jste šli X kroků“), což propojuje výpravu s kronikou.
- Roční přehled („Váš rok na cestách“) v prosinci.
- Pohlednice z dokončených výprav jako sdílený výstup (obrázek, žádná sociální síť).

## 11. Model zdarma a placeného

### 11.1 Vždy zdarma

- Neomezené počítání kroků a vzdálenosti
- Import historie a celá osobní kronika včetně statistik
- Životní cesta
- Jedna až dvě úvodní výpravy v plné kvalitě
- Dokončení každé rozjeté výpravy
- Export vlastních dat

### 11.2 Placené („víc“)

- Další výpravy po balíčcích
- Rozšířený příběhový obsah
- Offline mapy a doplňkové styly map (závisí na licenčních podmínkách poskytovatele map)
- Souběžné výpravy (po jejich zavedení)
- Tištěná kronika, plakát s mapou, pohlednice
- Pokročilé roční přehledy

### 11.3 Doporučení pro start

Balíčky tras + fyzické produkty. Předplatné „Atlas“ zvážit až po ověření retence.

### 11.4 Rizika modelu

- Příliš štědré zdarma může snížit konverzi. Proto se platí za nový obsah, ne za funkce.
- Konverze u modelu zdarma bývá nízká, potřeba dostatečný objem uživatelů nebo ziskový doplněk (fyzické produkty).
- Obsah je nákladný pro autora, nikoli pro server.

## 12. Soukromí a důvěra

- Zdravotní data jsou citlivá (GDPR, zvláštní kategorie): zpracování **primárně na zařízení**, synchronizace volitelná.
- Účet není povinný.
- Export dat kdykoli (CSV, PDF, GPX).
- Jasná odpověď na „co když aplikace zanikne“: data patří uživateli.

## 13. Rozsah MVP

**Obsahuje:**

1. Import historie z Apple Health (iOS) a Health Connect (Android) a základní evidence pohybu na obou platformách
2. Karta života po importu
3. Životní cesta v segmentech
4. Dvě výpravy: krátká úvodní (50–100 km) a jedna delší vlajková
5. Mapa s postupem, etapy, zastávky, malé objevy
6. Statistiky a kronika zdarma
7. Dokončení výprav, milníky, pohlednice
8. Tok prvního týdne dle kapitoly 9
9. Export dat

**Neobsahuje:** sociální funkce, soutěže, žebříčky, náhodné události, fikční výpravy, více souběžných výprav, večerní zastávky, rozšířený příběh (úroveň 3), webovou a tabletovou verzi.

## 14. Metriky

- Podíl dokončeného importu historie
- Čas do prvního objevu
- Návrat v den 3, 7, 30 a 90
- Podíl, kdo dokončí první etapu a první výpravu
- Sdílení karty života a pohlednic
- Konverze na první placený balíček
- Zpětná vazba: „proč se vracím“ (krátký volitelný dotazník)

## 15. Rizika

- **Retence** u aplikace bez nátlaku, hlavní riziko produktu.
- **Náklady na obsah** a práva k fotografiím.
- **Dostupnost historických dat** (zejména Android: Health Connect čte ve výchozím stavu jen 30 dní zpět, starší data vyžadují zvláštní oprávnění).
- **Schválení v Google Play.** Oprávnění ke čtení historie v Health Connectu a deklarace zdravotních dat podléhají kontrole Googlu. Zamítnutí by znamenalo, že hlavní „wow“ (karta života) na Androidu nefunguje; záložní cesta je ruční zadání a import z exportu. Podat žádost a ověřit co nejdřív.
- **Konverze** při velkorysém zdarma.
- **Odlišení** od Walk the World (podobná filozofie) a Conquerora (silná značka).
- **Důvěra**: data o zdraví, životnost aplikace.

* **Paralelní vývoj dvou platforem** zvyšuje náročnost testování a práce se zdravotními oprávněními.

## 16. Otevřené otázky

- Pracovní název a jazyky při spuštění
- Která úvodní a která vlajková výprava
- Přesné délky etap a hustota objevů (ověřit testem)
- Rozsah bezplatného obsahu (jedna, nebo dvě výpravy)
- Cena balíčků a podoba fyzických produktů
- Povinnost účtu a synchronizace mezi zařízeními. Bez účtu je potřeba vyřešit zálohu a přenos na nový telefon (např. šifrovaný export/import souboru nebo volitelný anonymní účet).
- Volba cross-platform technologie (např. Flutter, React Native nebo Kotlin Multiplatform) a požadavky Google Play na oprávnění k historii v Health Connectu
- Licence k fotografiím a trasovým datům

## 17. Plán ověření a další kroky

1. **Týden 1–2:** landing page a krátký prototyp importu s kartou života na Androidu (Health Connect s oprávněním pro historii) i na iOS (HealthKit), včetně ověření délky historie na reálných zařízeních. Cíl: ověřit, zda lidé historii chtějí a sdílejí ji.
2. **Týden 3–4:** výběr cross-platform technologie, datový model (úrovně důvěry, pravidla započítávání).
3. **Měsíc 2–3:** první výprava v plné kvalitě jako šablona. Test prvního týdne s několika uživateli.
4. **Pak:** druhá výprava, test monetizace (první balíček), vyhodnocení metrik z kapitoly 14.
