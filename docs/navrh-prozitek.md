# Návrh prožitku: Atlas, který kreslíte nohama

Verze 2 · 2. 11. 2026 · Vychází z `dev/android-verifikace` (APK 1.4.0), testu na telefonu a zpětné vazby „pořád slabé, chci wow“.

Rozhodnuto (2. 11. 2026): **delší pěší trasa** po souši · **světlý vzhled výchozí**, tmavý jako volba · **metry i kroky** u krátkých vzdáleností · **obsah sbíráme z webu, člověk ověřuje** (podklady: [obsah-vltavska-podklady.md](obsah-vltavska-podklady.md)) · **widget a upozornění až po vyladění aplikace**.

Tento dokument je plán UX/UI. Nic z něj zatím není naprogramované.

---

## 0. Proč verze 1 působila slabě

Verze 1 opravovala chyby a přidávala funkce. Správně, ale „wow“ z toho nevznikne. Wow vzniká ze tří věcí, které tam chyběly:

1. **Jedna velká myšlenka**, kterou člověk pozná na první pohled a převypráví kamarádovi.
2. **Podpisové okamžiky** – pár momentů vyladěných do posledního detailu (pohyb, zvuk, haptika, text), ne deset průměrných obrazovek.
3. **Obsah, u kterého člověk řekne „to jsem nevěděl“** – a hned to chce někomu říct.

Všechno níže slouží těmto třem bodům.

---

## 1. Velká myšlenka: rozkreslený atlas

> **Aplikace je starý ručně kreslený atlas, který zatím není hotový. Dokreslujete ho chůzí.**

- Před vámi je krajina jen **načrtnutá tužkou** – tenké linky, světlý pergamen, místa jako prázdné kroužky s otazníkem.
- Kudy jste prošli, tam se krajina **vybarví inkoustem a akvarelem**: řeka zmodrá, lesy zezelenají, vaše stopa je sytá rudá čára, místa dostanou ilustrovanou **pečeť**.
- Na konci výpravy máte **celý list atlasu**, kreslený vaší cestou, s daty u každého místa. Ten jde stáhnout, sdílet a (později, placeně) **vytisknout jako plakát**.

Proč to funguje:
- Navazuje na to, co se líbí už teď (mapová stránka, pergamen, medailony).
- Postup je **vidět bez čísel**: kus atlasu je hotový, kus ne. Pocit „dokončit obrázek“ je silnější motivace než procenta, a přitom netlačí (žádné termíny).
- Je to **originální**: Conqueror má Street View, Pikmin Bloom květiny na mapě, Walk the World pas. Atlas, který se dokresluje chůzí, nemá nikdo.
- Má obchodní konec: tištěný atlas a plakát jsou ve spec 11.2 už teď.

**Technicky proveditelné** (bez kódu teď, jen ověření směru): MapLibre umí dvě vrstvy stylu – „skica“ (šedé linky, bez výplní) a „kolorovaná“ (dnešní pergamenový styl). Kolorovaná vrstva se zobrazí jen v koridoru kolem ušlé části trasy (maska z bufferu ušlého úseku). Animace „vpíjení inkoustu“ = postupné zvětšování masky podél trasy. Pečeti jsou předkreslené obrázky jako dnešní medailony.

---

## 2. Šest podpisových okamžiků

### M1 · Návrat: „Inkoust“ (otevření aplikace po chůzi)

Nahrazuje šedou kartu „Od posledně jste ušli 9,1 km“.

1. Obrazovka se otevře na atlasu v místě, kde jste byli **naposledy**. Nad ním jedna řádka: *„Od pátku 9,1 km. Podívejte, kudy jste šli.“*
2. Kamera plynule **letí po trase** (4–6 s), za ní se krajina vybarvuje inkoustem. Číslo kilometrů nahoře roste.
3. Když kamera mine místo, **dopadne pečeť**: krátké „razítko“ (zvětšení a dosednutí, 250 ms), jemná haptika, název se na chvíli rozsvítí.
4. Na konci kamera zastaví na vaší tečce. Dole vyjede karta: *„Cestou jste potkali 6 míst“* s řadou pečetí a tlačítkem **Projít je**.

Pravidla: klepnutím kdykoli přeskočit · přehrává se jen tehdy, když přibylo ≥ 300 m nebo nějaké místo · při „Omezit pohyb“ v systému jen prolnutí · nikdy dvakrát pro stejný úsek.

### M2 · Projít objevy: příběhy z cesty

Celoobrazovkové karty, listování do strany, vlastním tempem (bez časovače):

```
┌───────────────────────────────┐
│ ● ● ○ ○ ○ ○        3 z 6    ✕ │
│ ┌───────────────────────────┐ │
│ │      [velká fotografie    │ │
│ │       nebo stará rytina]  │ │
│ └───────────────────────────┘ │
│ MALÝ OBJEV · KM 0,7           │
│ Výtoň                         │
│                               │
│ ❝ Clo se tu platilo sekerou.  │
│   Z každého voru celníci      │
│   vytnuli dvanáctinu klád –   │
│   odtud jméno Výtoň. ❞        │
│                               │
│ Celnice z 16. století je      │
│ poslední stavbou zmizelého    │
│ Podskalí. Dnes v ní je        │
│ muzeum vorařství.             │
│                               │
│ Došli jste sem ve čtvrtek     │
│ 30. října · kapitola Voraři 2/5│
│                               │
│ [ Na mapě ]   [ Další › ]     │
└───────────────────────────────┘
```

- **Háček** (velkým písmem, uvozovky) je to, co si člověk zapamatuje. Teprve pod ním kontext.
- Datum dosažení dělá z faktu **osobní vzpomínku** („tohle jsem objevil ve čtvrtek“).
- Poslední karta = *„Co vás čeká“*: další místo a jeho hádanka (M3).

### M3 · Hádanka u cesty (zvědavost místo povinnosti)

Každé zamčené místo má **otázku**, ne jen název. Ukazuje se v „Na dalších 5 km“ i u další zastávky:

> **Trojský zámek · 40 m (asi 55 kroků)**
> *Proč se celá čtvrť jmenuje podle Tróje, když se původně jmenovala Zadní Ovenec?*

- Volitelně si můžete **tipnout** ze tří odpovědí. Žádné body, žádné skóre, jen při odemčení: *„Tipovali jste správně“* nebo *„Tohle překvapí: …“*. Tip zvyšuje zvědavost a fakt si člověk líp zapamatuje.
- Je to hlavní nástroj „důvodu jít ven“, aniž by aplikace cokoli vyžadovala: *jdu ven, protože chci vědět odpověď*.

### M4 · Příchod naživo

Když je aplikace otevřená a přijdou data, která odemknou místo:
- pečeť dopadne přímo na mapě, telefon jemně zavibruje, nahoře *„Právě jste došli k Trojskému zámku“* a rovnou odpověď na hádanku.
- Toto je odpověď na „když nechám aplikaci spuštěnou, změnu se nedozvím“: obnova při návratu do popředí, každou minutu v popředí, stažením dolů. (Zdroj dat – Google Fit, Samsung Health, hodinky – zapisuje s prodlevou; aplikace to poctivě ukazuje: „aktualizováno před 2 min“.)

### M5 · Přívoz (událost na trase)

Delší pěší trasa přechází řeku přívozy (Podbaba–Podhoří, Libčice–Letky) a lávkami. Přechod je **malá scéna**: mapa se přiblíží, lodička přepluje řeku, karta *„Převezli jste se přívozem P2. Přívoz tu býval už v roce 1888.“* Řeka tím přestane být jen pozadím a stane se součástí cesty.

### M6 · Pohlednice z etapy a list atlasu z výpravy

- Konec etapy: **pohlednice** – líc: ilustrace nebo fotka úseku s ručně psaným názvem; rub: vaše razítka, data („24.–30. října, 6 dní, 18,6 km, 12 míst“), krátký text složený z vašich objevů. Otočení pohlednice gestem. Sdílet jako obrázek.
- Konec výpravy: **list atlasu** celé trasy, vybarvený, s pečetěmi a daty. Stažení ve vysokém rozlišení, později tisk.

---

## 3. Interakce: aplikace se ptá, ukazuje a nabízí

Bez nátlaku, ale ne pasivní:

| Interakce | Jak vypadá | Proč |
|---|---|---|
| **Kam dnes dojdu?** | Na Domů posuvník nebo tah prstem po trase: „1 km · 2 km · 5 km“. Atlas ukáže, co by se odemklo: *„3 km = Trojský zámek a Sedlecké skály“.* | Cíl z vlastní zvědavosti, ne denní kvóta. |
| **Hádanky** (M3) | Tip ze tří odpovědí. | Zvědavost, zapamatování. |
| **Odbočky** | U vybraných míst volba: *„Odbočit na Levý Hradec (+0,8 km)?“* Odbočka přidá místo navíc, hlavní trasa zůstane. Rozhoduje se kdykoli předem. | Pocit volby a vlastní cesty. |
| **Kapitoly** | Nitky přes více míst: *Voraři* (Výtoň → náplavka → … → Libčice), *Šlechtická sídla* (Troja, Roztoky, Nelahozeves, Veltrusy), *Mosty a lávky*, *Ostrovy*, *Pověsti*. Dokončená kapitola = ilustrace na okraj atlasu. | Sbírka bez chamtivosti, propojuje místa v příběh. |
| **Poslech cestou** (P2) | U zastávek 60–90 s audio vyprávění. *„Pusťte si Trojský zámek na dnešní procházku.“* | Při skutečné chůzi se dívat do telefonu nechcete; poslouchat ano. Výrazné odlišení od všech konkurentů. |
| **Řeka teď** (P2) | U míst u řeky živý údaj: průtok a hladina z nejbližšího vodočtu ČHMÚ, teplota, západ slunce. *„Vltava u Vraňan teď teče 98 m³/s.“* | Spojení virtuální cesty se skutečným místem právě teď. Nutno ověřit licenci dat ČHMÚ. |
| **Tehdy a dnes** (P2) | U vybraných míst posuvník stará fotografie / dnešek (Wikimedia Commons, archivy s volnou licencí). Podskalí s vory, Výtoň před sto lety. | Silné „wow“ za malou cenu. |

---

## 4. Obrazovky (UI)

Vizuální směr: **světlý pergamen jako výchozí** (dnešní světlé tokeny), písmo IM Fell pro názvy, Work Sans pro text. Tmavý režim v nastavení (Světlý · Tmavý · Podle systému). Méně karet s rámečkem, víc práce s atlasem, ilustracemi a typografií.

### 4.1 Domů = atlas, ne výpis

```
┌───────────────────────────────┐
│ Pondělí 2. listopadu     ⚙︎   │
│                               │
│ ┌───────────────────────────┐ │
│ │  [ATLAS: vybarvená část,  │ │
│ │   moje tečka, pečeti,     │ │
│ │   před mnou tužková       │ │
│ │   skica]                  │ │
│ └───────────────────────────┘ │
│ Vltavská stezka · 12,5 z 78 km│
│ ▬▬▬▬▬▬▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭ │
│                               │
│ DALŠÍ ZASTÁVKA                │
│ Trojský zámek                 │
│ 40 m · asi 55 kroků           │
│ ❓ Proč se čtvrť jmenuje      │
│   podle Tróje?   [Tipnout]    │
│                               │
│ NA DALŠÍCH 5 KM · 3 místa     │
│ ○ Sedlecké skály   1,9 km  ❓  │
│ ○ Přívoz Podbaba   3,4 km  ⛴  │
│                               │
│ NEDÁVNO OBJEVENO              │
│ ◉ Trojská lávka · čt          │
│ ◉ Císařský ostrov · čt        │
│                               │
│ [ Kam dnes dojdu? ]           │
└───────────────────────────────┘
```

- Atlas nahoře je živý náhled (po klepnutí přechod na záložku Výprava).
- Když je co ukázat, nad tím vším se přehraje M1.
- Délka kroku, zdroje a licence, vzhled → ⚙︎ Nastavení (hlavička dnes přetéká).

### 4.2 Výprava (mapa)

Zůstává hlavní obrazovkou, mění se styl na **skica / inkoust**. Spodní panel jako dnes, navíc hádanka další zastávky a ikony kapitol. Medailony dosažených míst ukazují datum.

### 4.3 Detail místa

Pořadí: fotografie přes celou šířku → typ a km → název → **háček** → kontext → *„Až tam jednou půjdete“* (co uvidíte naživo, otevírací doba, jak se tam dostat) → kapitola → zdroje a licence (sbalené). U zamčeného místa: rozmazaná fotka, hádanka, vzdálenost v metrech a krocích. Text „Koncept obsahu“ se v aplikaci nezobrazuje; neověřený obsah se do vydání nedostane.

### 4.4 Kronika = deník

- **Atlas všech výprav** (dokončené listy).
- **Deník po dnech**: *„Úterý 28. října · 6,2 km · Karlův most, Štvanice“* s miniaturami pečetí (inspirace Pikmin Bloom lifelog).
- Statistiky (už jsou) jako druhá úroveň.
- Sbírka pohlednic a kapitol.

### 4.5 Objevovat

Do vydání druhé výpravy: jedna karta *„Připravujeme: …“* s náhledem skicy trasy a tlačítkem „Chci vědět, až bude“ (jen lokální poznámka). Prázdná stránka „Knihovna se připravuje“ pryč.

### 4.6 Jazyk vzdáleností (rozhodnuto)

- ≥ 10 km: celé km („23 km“) · 1–10 km: jedno desetinné místo („3,4 km“) · < 1 km: metry po 10 m **a kroky** („40 m · asi 55 kroků“) · < 15 m: **„Jste tady“**. Nikdy „0,0 km“.
- Kroky z osobní délky kroku (rozhodnutí 0006), vždy s „asi“.
- Jedno pravidlo pro všechny obrazovky.

### 4.7 Pohyb, haptika, zvuk

| Prvek | Trvání | Pozn. |
|---|---|---|
| Let kamery M1 | 4–6 s, ease-in-out | přeskočitelný |
| Vpíjení inkoustu | souběžně s letem | maska podél trasy |
| Dopad pečeti | 250 ms, mírný přestřel | haptika „light“ |
| Otočení pohlednice | 400 ms 3D | gesto i klepnutí |
| Počítadlo km | 1 s | jen při změně |

Zvuk ve výchozím stavu vypnutý (volitelné „škrábání pera“ a razítko). Vše respektuje „Omezit pohyb“.

---

## 5. Obsah: co z toho dělá wow

### 5.1 Šablona místa (upravená spec 7.3)

| Pole | Délka | Povinné |
|---|---|---|
| **Hádanka** (otázka před odemčením) | 1 věta | ano |
| **Háček** (odpověď / překvapivý fakt) | 1–2 věty | ano |
| Kontext | 2–3 věty | zastávky |
| Až tam půjdete | 1–2 věty | zastávky |
| Kapitola | odkaz | volitelně |
| Fotka / stará fotka „tehdy“ | s licencí | zastávky |
| Zdroje | 2 nezávislé | ano |
| Ověřil, datum | | ano |

### 5.2 Postup „sklizeň → ověření“ (rozhodnuto)

1. **Sklizeň**: z české Wikipedie a dalších veřejných zdrojů se pro každé místo vytáhnou kandidáti na háček (už hotové pro 30 míst, viz [podklady](obsah-vltavska-podklady.md)).
2. **Návrh**: hádanka + háček + kontext napsané lidsky, s odkazem na zdroj.
3. **Ověření člověkem**: druhý nezávislý zdroj (Památkový katalog NPÚ, web muzea/obce, odborná literatura), datum ověření. Bez druhého zdroje se fakt nepoužije.
4. **Vydání**: jen ověřená místa; ostatní zůstanou jako „malý objev“ s jednou ověřenou větou.

Už sklizeň ukázala, proč je ověření nutné: slavné „palindromové“ datum Karlova mostu (9. 7. 1357, 5:31) podle Wikipedie možná stojí na roce 1358 z kroniky, který se přes 100 let čte jako 1357. **I tohle je skvělý háček**, jen se musí podat poctivě.

### 5.3 Ochutnávka (k ověření)

| Místo | Hádanka | Háček |
|---|---|---|
| Vyšehrad | Kde je Vltava v Praze nejhlubší? | Pod Vyšehradem: 42 m vysoká skála z ordovických břidlic tu padá přímo do řeky. |
| Výtoň | Jak se platilo clo sekerou? | Celníci z každého voru vytnuli dvanáctinu klád, odtud jméno Výtoň. |
| Karlův most | Proč možná neplatí nejslavnější datum mostu? | Palindrom 1357 9 7 5 31 se možná opírá o špatně přečtený rok. A „Karlův“ se mu říká teprve asi od roku 1870, předtím Kamenný most. |
| Libeňský most | Co je na tomhle mostě jediné na světě? | Bývá označován za jediný kubistický most na světě a má největší rozpětí oblouku z prostého betonu v Evropě. |
| Trojský zámek | Proč se čtvrť jmenuje podle Tróje? | Podle antických výjevů na zámku; předtím se místo jmenovalo Zadní Ovenec. |
| Levý Hradec | Kde byl zvolen svatý Vojtěch? | Tady, 19. února 982, druhým pražským biskupem. |
| Řež | Co tu vzniklo v březnu 1909? | První česká anarchistická kolonie. Do roka byla zadlužená. |
| Veltrusy | Kde byl první vzorkový veletrh na světě? | V zámeckém parku, roku 1754, za účasti Marie Terezie. |
| Lužec nad Vltavou | Která obec je celá na ostrově? | Lužec, od roku 1907, kdy kanál oddělil kus pevniny. Má jedinou ostrovní školu v zemi a jediný zdvihací železniční most v Česku. |
| Kralupy | Odkud se vzalo jméno Kralupy? | Možná od „loupačů kůry“, pravděpodobněji od „těch, co loupí kury“. |

Plný seznam se zdroji: [obsah-vltavska-podklady.md](obsah-vltavska-podklady.md).

### 5.4 Místa bez příběhu nahradit

„Polabská rovina“, „Říční tůně“, „Slepé rameno“, „Lužní les“ jsou dnes obecné popisky. Navrhuji je vyměnit za konkrétní místa s příběhem nebo spojit do kapitoly (*Řeka a povodně 2002*).

---

## 6. Trasa (rozhodnuto: delší)

- Pěší trasa po nábřežích, stezkách a cyklostezkách, s přívozy jako událostmi (M5). Odhad **75–90 km**; první zkušební výpočet pěšího routingu vyšel na 89 km s objížďkami, po doladění průchozích bodů bude kratší.
- **5 etap** po 15–20 km, každá končí zastávkou a pohlednicí. Pracovně: Praha historická (Vyšehrad → Troja) · Pražské skály (→ Roztoky) · Údolí Vltavy (→ Kralupy) · Zámky (→ Veltrusy) · Ke soutoku (→ Mělník).
- Delší trasa potřebuje 6–10 nových míst; přednost mají místa s háčkem (přívozy, Hořínský zdvižný most, mělnické vinice a sgrafita, Klecany a pověst o zvonech).
- Typ trasy zůstává „Vlastní virtuální trasa“, popis: „po stezkách podél Vltavy“.

---

## 7. Plán: nejdřív jedna dokonalá etapa

Místo zlepšování všeho napůl: **etapa 1 (Praha) dotažená na 100 %** jako vzor, pak škálování.

| Fáze | Obsah | Kdy je hotovo |
|---|---|---|
| **0 · Základ** | Světlý vzhled, jazyk vzdáleností, obnova v popředí a stažením, nastavení ⚙︎, pryč s „Koncept obsahu“ v UI | Žádná „0,0 km“, aplikace žije, když je otevřená. |
| **1 · Obsah etapy 1** | 11 míst Prahy podle nové šablony, ověřené dvěma zdroji, fotky s licencí, 2 kapitoly (Voraři, Mosty) | Ověřovatel podepíše každé místo. |
| **2 · Okamžiky** | M1 Inkoust, M2 Příběhy, M3 Hádanky, M4 Příchod naživo | Testovací osoba po návratu z procházky řekne nahlas aspoň jeden fakt. |
| **3 · Atlas** | Styl skica / inkoust, pečeti, nová Domů | Na první pohled je vidět, kolik atlasu je „dokresleno“. |
| **4 · Trasa** | Pěší trasa, 5 etap, přívozy (M5) | Mapa nikde nevede vodou. |
| **5 · Odměny** | Pohlednice etapy, list atlasu, Kronika jako deník | Pohlednici chce testovací osoba sdílet. |
| **6 · Rozšíření** | Zbývající etapy obsahu, „Kam dnes dojdu?“, odbočky, Tehdy a dnes | |
| **7 · Poslech a Řeka teď** | Audio u zastávek, živé údaje ČHMÚ | |
| **8 · Mimo aplikaci** (rozhodnuto: až po vyladění) | Aktualizace na pozadí šetrně k baterii, widget, lokální upozornění na události (viz příloha A) | |

### Jak poznáme wow (test s 5 lidmi po fázi 2 a 3)

- Po otevření s novými místy otevře **aspoň jedno** > 80 % lidí.
- Den poté umí člověk **zopakovat jeden fakt** (bez nápovědy).
- Spontánně ukáže aplikaci někomu dalšímu nebo sdílí pohlednici.
- Nikdo neřekne „tlačí mě to“.

---

## 8. Co si bereme od konkurence (shrnutí)

| Od | Bereme | Kde |
|---|---|---|
| The Conqueror | pohlednice u milníků, pohled na místo | M6, Tehdy a dnes |
| Pikmin Bloom | mapa jako osobní deník, denní záznam | Atlas, Kronika |
| Walk the World | pas s razítky | pečeti |
| Apple / Google Fit | animace dovršení | M1, M4 |
| Komoot | trasa po skutečných cestách | kap. 6 |
| audio průvodci / podcasty | poslech při chůzi | Poslech cestou |
| Walk the Distance (protipříklad) | prázdné zastávky = nikdy | kap. 5 |

Zdroje: [The Conqueror review](https://hometechhacker.com/the-conqueror-virtual-challenges-review-motivation-medals-and-miles/), [Is The Conqueror legit](https://abusonadustyroad.com/is-the-conqueror-virtual-challenge-legit-10-things-to-know-and-understand), [Best virtual challenges](https://abusonadustyroad.com/best-virtual-challenges-and-why-we-love-them), [Virtual walking challenge apps](https://walking-startup.uk/blog/virtual-walking-challenge-apps), [Design critique: Pikmin Bloom](https://ixd.prattsi.org/2026/02/design-critique-pikmin-bloom-iphone-app/), [Pikmin Bloom (Engadget)](https://www.engadget.com/pikmin-bloom-has-been-helping-me-meet-my-outdoor-walking-goals-for-years-000025214.html).

---

## Příloha A · Pozadí, widget, upozornění (fáze 8, až po vyladění)

- **Pozadí**: Android `READ_HEALTH_DATA_IN_BACKGROUND` + periodická úloha (30–60 min, systém slučuje, respektuje úsporný režim; funkce nemusí být na každém zařízení), iOS HealthKit background delivery. Úloha jen sečte vzdálenost, zapíše události, obnoví widget. Bez polohy a sítě. [Health Connect: čtení dat](https://developer.android.com/health-and-fitness/guides/health-connect/develop/read-data)
- **Widget**: výřez atlasu s tečkou + „Trojský zámek za 40 m“ + hádanka. Informuje, neruší.
- **Upozornění** (lokální, výchozí vypnuto, nabídka až po první etapě): dosažená zastávka s hádankou („Došli jste k Trojskému zámku. Uhodnete, proč se jmenuje podle Tróje?“), pohlednice etapy, týdenní shrnutí v neděli. Strop 1 denně, tiché hodiny 21–8, nikdy připomínání nečinnosti.

## Příloha B · Chyby z testu (pro fázi 0)

- „0,0 km“ a zároveň zamčeno: zbývalo < 50 m, formát na desetiny km.
- Odemčené místo bez obsahu a s nápisem „Koncept obsahu“.
- Data se čtou jen při spuštění aplikace.
- Výchozí vzhled podle systému (tmavý).
- Trasa = osa řeky.
