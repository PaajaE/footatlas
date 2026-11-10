# Předání práce: stav k 2. 11. 2026

Pro dalšího agenta nebo vývojáře. Popisuje, co je hotové, kde to je a co zbývá. Stav odpovídá `main` po [PaajaE/footatlas#14](https://github.com/PaajaE/footatlas/pull/14) (merge commit `192362b`) a větvi `claude/prozitek-faze2` s balíkem B (mapa jako atlas, rozhodnutí 0020, viz níže).

## 1. Kontext v kostce

FootAtlas je mobilní aplikace (Expo SDK 58, React Native, expo-router, pnpm workspace), která proměňuje kroky ze zdravotních dat (Health Connect / HealthKit) ve virtuální výpravy a celoživotní kroniku. Pilotní výprava je **Vltavská stezka** (Vyšehrad → soutok v Mělníku).

Po testu APK 1.4.0 na telefonu majitel produktu chtěl výrazně lepší prožitek: aplikace působila staticky, zastávky byly prázdné, ukazovala „0,0 km“, trasa vedla Vltavou a otevřená aplikace se neobnovovala. Vznikl návrh **„Atlas, který kreslíte nohama“** a z něj první fáze implementace.

**Přání majitele (závazná):**
- Výchozí vzhled je **světlý** pro všechny, tmavý jen jako volba.
- U krátkých vzdáleností **metry i kroky**, nikdy „0,0 km“.
- Obsah míst: **zajímavá fakta**, ne obyčejné info; sbírat z webu, **člověk ověřuje**. V UI žádné poznámky „k ověření“; ověřování patří do úkolů a dat (`verified: false`).
- UI má být **příjemně zaplněné**, s animacemi a smysluplnými přechody; texty duchaplné.
- **Widget a upozornění až po vyladění aplikace.**
- Komunikace s majitelem česky.

## 2. Kde co je

| Co | Kde |
|---|---|
| **Cílový vzhled (závazný), rozbor a plán balíků A–E** | `docs/design-prototyp.md`, snímky `docs/prototyp-snimky/` |
| Návrh prožitku, plán po fázích | `docs/navrh-prozitek.md` |
| Podklady k obsahu a **seznam faktů k ověření** | `docs/obsah-vltavska-podklady.md` (sekce „Úkoly k ověření“) |
| Interaktivní mockupy (vzor pro implementaci) | `docs/mockupy/` (README tam), plátno Claude Design „FootAtlas prototyp Inkoust“: https://claude.ai/artifact/QEXiSvreAHWUFWqQ4kBKny |
| Rozhodnutí | `docs/rozhodnuti.md`, nová 0014–0017 |
| Specifikace produktu | `docs/specifikace.md` |
| Pokyny pro Expo | `apps/mobile/AGENTS.md` |
| Build APK | `docs/release-apk.md`, `tools/release-apk.sh` |

**Mockupy, které je dobré otevřít jako první:** `Aplikace.dc.html` (celý průchod s přechody), `Main.dc.html` (návrat „Inkoust“), `Pecete.dc.html` (pečeti, razítka, specifikace pohybu), `Domu.dc.html`, `Kronika.dc.html`, `Zastavka.dc.html`, `Hadanka.dc.html`. Noční varianty `*-noc.dc.html` používají `noc.css` (jen pro prototyp; v aplikaci se tmavý vzhled řeší tokeny v `apps/mobile/src/theme/tokens.ts`).

### Navigace (rozhodnutí 0034, balík L)

Tři záložky v `apps/mobile/src/app/(tabs)/`: **Výprava** (`vyprava.tsx`, otevírá se jako první: mapa, pruh Mezitím, panel se třemi polohami; bez výpravy výběr výpravy a Životní cesta), **Atlas** (`atlas.tsx`: výpravy, razítka a pečeti, pohlednice, témata) a **Kronika** (`kronika.tsx`: Deník s dlaždicemi Dnes / Za 7 dní, Cesta, Rok). Domů a Objevovat zanikly; `/` → `/vyprava` (`app/index.tsx`), `/objevovat` → `/atlas` (`app/objevovat.tsx`), `/kronika?tab=sbirky` → `/atlas`. Sekce panelu jsou v `components/PanelSections.tsx`, „Před vámi“ v `components/PredVami.tsx` + `src/predvami.ts`, Mezitím v `components/MezitimStrip.tsx` + `src/mezitim.ts`, další cíl v `src/cil.ts`, polohy panelu v `src/panel.ts`. Starší zmínky o Domů a Objevovat níže jsou historické.

## 3. Hotovo v aplikaci (na `main`)

| Rozhodnutí | Co | Hlavní soubory |
|---|---|---|
| 0014 | Světlý vzhled výchozí, volba se ukládá; `formatDistance` („40 m · asi 55 kroků“, „Jste tady“); obrazovka Nastavení; ozubené kolo na Domů | `src/format.ts` (+test), `src/theme/ThemeProvider.tsx`, `src/state/storage.ts`, `src/app/nastaveni.tsx`, `src/app/(tabs)/index.tsx`, `vyprava.tsx` |
| 0015 | Živá obnova: návrat do popředí (min. 15 s odstup), každou minutu v popředí, stažení prstem; na pozadí nic; „Aktualizováno před N min“ | `src/state/ExpeditionProvider.tsx`, `src/state/refreshPolicy.ts` (+test), `src/components/LastUpdated.tsx`, `src/components/ui.tsx` |
| 0016 | Příběhy míst odděleně od geometrie: háček, upoutávka, hádanka (3 možnosti), kontext, tip „Až tam půjdete“, kapitola, zdroje. 14 míst 1. etapy, 5 kapitol. Nový detail místa | `packages/content/src/story.ts` (+test), `packages/content/data/vltavska-stezka/obsah.json`, `apps/mobile/src/data/vltavska.ts`, `apps/mobile/src/app/zastavka/[id].tsx` |
| 0018 | Tipy k hádankám, „Projít je“ (příběhy objevů), Domů (hádanka, Kam dnes dojdu?, Nedávno objeveno, Kapitoly), Objevovat, deník v Kronice | `src/riddle.ts` (+test), `src/components/Riddle.tsx`, `src/components/HomeSections.tsx`, `src/app/objevy.tsx`, `src/state/useTips.ts` |
| 0021 | Kronika (zeměkoule, Deník / Cesta / Rok / Sbírky), Objevovat (připravované výpravy, „Chci ji“, banner životní cesty), Karta života; čistá logika s testy (balík C) | `src/kronika/*` (+testy), `src/components/kronika/*`, `src/components/objevovat/*`, `src/app/(tabs)/kronika.tsx`, `objevovat.tsx`, `src/app/karta-zivota.tsx` |
| 0017 | Pěší trasa po souši (OSRM nad OSM), 62,25 km, 4 etapy (Roztoky, Kralupy, Vraňany, Mělník) | `tools/route/build-walking-route.mjs` (+README), `packages/content/data/vltavska-stezka/route.json`, `expedition.json`, `pilot.test.ts` |
| 0020 | **Balík B: mapa jako ilustrovaný atlas** a nová Výprava: styl skica + kolorovaná vrstva v masce kolem ušlé trasy, vzory, glyfy IM Fell, pečeti a razítka míst, kresby (loď, zámek, most), rámeček s měřítkem, plovoucí karta a spodní panel | `packages/map-style/src/atlas.ts`, `reveal.ts`, `src/components/ExpeditionMap.tsx`, `AtlasFrame.tsx`, `src/app/(tabs)/vyprava.tsx`, `src/map/atlasPlaces.ts`, `vypravaInfo.ts`, `tools/maps/make-{medallions,patterns,glyphs}.py`, `render-atlas.mjs` |

Cesty v tabulce jsou relativně k `apps/mobile/` u aplikace.

**Kontroly:** `pnpm install --frozen-lockfile`, pak `pnpm test` (core 118, content 24, mobile 25, map-style 13, api 6) a `pnpm typecheck`, vše zelené.

**NEOVĚŘENO na zařízení:** vše z 0014–0016 (živá obnova, Nastavení, nový detail místa). Trasa 0017 neověřena v terénu.

### Balík D (větev `claude/balik-d-navrat`, rozhodnutí 0022)
Hotovo: návrat „Inkoust“ (`/navrat`, `src/navrat.ts`, `FlightMap`), příchod naživo (`ArrivalHost`, `src/prichod.ts`), pohlednice z etapy (`/pohlednice`, `src/pohlednice.ts`) a scéna přívozu (`/privoz`, `src/privoz.ts`); čistá logika má testy. Domů ukazuje `ReturnCard`, detail místa „Poslat jako pohlednici“, Sbírky v Kronice vedou na pohlednici. Úkoly 5, 8, 16 a 17 níže jsou tím splněny. **Na zařízení NEOVĚŘENO**: let kamery MapLibre, výkon masky po krocích, nativní vykreslení. Chybí haptika (`expo-haptics`) a „Sdílet obrázek“ (potřebuje nativní modul `react-native-view-shot`); oboje vyžaduje nový build.

### Balík A (větev `claude/balik-a-zaklad`, rozhodnutí 0019)
Hotovo: tokeny (světlé i noční), sdílené komponenty (pečeť, medailon, záhlaví, dlaždice, čip, karta s popiskem), nové Domů a detail zastávky včetně zamčeného místa. Chybí haptika dopadu pečeti (není `expo-haptics`), „Poslat jako pohlednici“ (balík D). Na zařízení neověřeno.

### Domů: shoda s prototypem (větev `claude/domu-shoda`)

Domů znovu srovnáno s `08-domu.jpg` / `19-domu-noc.jpg` a `Domu.dc.html` při 390×844 (srovnání vedle sebe: `docs/domu-shoda/`). Opraveno: záhlaví (30/34 px, linka 1 px, odsazení 16 a mezery 16 jen na Domů přes `Screen top/gap`), „12,5 z 62 km“ bez zdvojené jednotky, dlaždice (12/24/12 px, poloměr 14), **medailon 72 px s čárkovaným kroužkem přes celý čtverec** (dřív jen ~55 px), karta další zastávky (14 px odsazení, hádanka 18/24, nižší tlačítko `compact`), „Kam dnes dojdu?“, kapitoly s jedním pruhem. Pořadí sekcí: záhlaví, etapa, dlaždice, další zastávka, (Od posledně), Kam dnes dojdu?, Nedávno objeveno, Kapitoly. `ReturnCard` je kompaktní, stojí až pod další zastávkou a ukazuje se jen při ≥ 300 m nebo novém místě; „Od posledně se nic nezměnilo“ (`SinceLastCard`) je pryč. Ukázkový postup pro snímek: `{"enabled":true,"walkedM":10437,"seenM":10437}` (40 m před Trojou; hodnota 12 460 z zadání je už za Trojou, další je pak Roztoky).

## 4. Úkoly

Priorita: **P0** hned, **P1** jádro prožitku, **P2** potom. Číslování fází odpovídá `docs/navrh-prozitek.md`, kapitola 7.

### P0: ověřit a dorovnat
1. **Build APK z `main` a test na telefonu** (Android): Domů (ozubené kolo, „Aktualizováno…“, stažení prstem), Nastavení (přepnutí vzhledu), detail místa (zamčené / odemčené), mapa s novou trasou (nevede vodou, medailony sedí). Výsledky zapsat k rozhodnutím 0014–0017.
2. **Záblesk světlého vzhledu** při zvoleném tmavém: volba se načítá asynchronně. Řešení: načíst volbu před skrytím splash screenu (`src/app/_layout.tsx`, `SplashScreen.hideAsync`).
3. ~~**Hustota míst:** mezera 4,4 km (Výhled na Říp → Vepřek)~~ Hotovo v balíku E (0023): Vepřek měl špatnou polohu, po opravě mezera zmizela, `pilot.test.ts` hlídá prázdné `issues`.
4. **Mapa po změně trasy:** zkontrolovat, že ušlý úsek a poloha na mapě v aplikaci odpovídají nové `route.json`. Trasa je do 1,5 km od staré, koridor 5 km stačí, ale ověřit vizuálně.

### P1: okamžiky z prototypu do aplikace (fáze 2–3)
Hotovo v rozhodnutí 0018: č. 6 (příběhy objevů, bez fotek), č. 7 (hádanka s tipem), část č. 10 (Domů bez výřezu atlasu) a č. 11 (jen deník po dnech). Balík C (rozhodnutí 0021) dodal č. 11, 12 a 20 níže; zbývá zbytek těchto bodů.
~~5. **Návrat „Inkoust“ (M1):** po otevření, když přibylo ≥ 300 m nebo místo: kamera MapLibre letí po ušlém úseku, razítka dopadají, počítadlo; přeskočitelné; respektovat „Omezit pohyb“. Vzor `docs/mockupy/Main.dc.html`. Data: `state.newlyReached`, `session.lastSeenWalkedM`, `markSeen`.~~ **Hotovo v balíku D (0022), na zařízení NEOVĚŘENO.**
6. **Příběhy objevů (M2):** celoobrazovkové listování nově odemčenými místy (háček, kontext, den dosažení, „co přibylo na mapě“). Vzor: příběhová část v `Main.dc.html`.
7. **Hádanka s tipem (M3):** u zamčeného místa tři možnosti, tip se uloží (SQLite nebo AsyncStorage) a vyhodnotí po odemčení. Data už jsou v `obsah.json` (`riddle.options`, `riddle.answer`). Vzor `Hadanka.dc.html`.
~~8. **Příchod naživo (M4):** když živá obnova odemkne místo při otevřené aplikaci, ukázat dopad pečeti a hlášku „Právě jste došli k …“ (+ haptika). Navázat na `refreshFor` v `ExpeditionProvider` (porovnat `reached` před a po).~~ **Hotovo v balíku D (0022), na zařízení NEOVĚŘENO.**
9. ~~Styl mapy skica / inkoust~~ **Hotovo v balíku B (rozhodnutí 0020), na zařízení NEOVĚŘENO.** Zbývá ověřit na emulátoru / telefonu: vzory (`fill-pattern`), maska (`beforeId` vrstev u zdrojů přidaných komponentami), štítek metrů (`icon-text-fit`), výkon `revealMask` a hustotu popisků; porovnat se snímky v `docs/mapa-atlas/` a `docs/prototyp-snimky/09-vyprava.jpg`. Dále: tažení spodního panelu na Výpravě, kresby dalších památek, ruční dolaďování noční palety, vzory se neotáčejí.
10. **Domů podle mockupu:** výřez atlasu nahoře, „Kam dnes dojdu?“ (1 / 2 / 4 km / konec etapy), nedávno objeveno, kapitoly. Vzor `Domu.dc.html`.
11. ~~**Kronika podle mockupu:** zeměkoule s ušlou částí obvodu, střídavé postřehy, Deník jako časová osa, Životní cesta, Rok den po dni, Sbírky. Vzor `Kronika.dc.html`. Data: `ChronicleProvider`, `expedition_event`.~~ Hotovo (0021), na zařízení neověřeno; zbývá pečeť ze sdílené komponenty a animace (otáčení zeměkoule, kreslení oblouku).
12. ~~**Karta života** po prvním načtení historie (onboarding).~~ Hotovo (0021); chybí „Sdílet kartu jako obrázek“ (skryto) a ověření na zařízení.

### P1: obsah
13. **Ověřit fakta** (včetně nových příběhů 2.–4. etapy) podle seznamu v `docs/obsah-vltavska-podklady.md` (dva nezávislé zdroje, datum), pak nastavit `verified: true`. Dělá člověk; agent může připravit druhé zdroje.
14. ~~**Příběhy pro etapy 2–4**~~ Hotovo v balíku E (rozhodnutí 0023): 23 příběhů, všechny `verified: false`. Zbývá najít příběh pro Slepé rameno a Říční tůně (zatím bez příběhu) a zkontrolovat nepřesné souřadnice Dolan, Lobečku, Letek a Zámku Hořín. Seznam tvrzení a druhých zdrojů: `docs/obsah-vltavska-podklady.md`.
15. **Licence fotek:** u Trojského zámku chybí autor (`docs/mockupy/assets/ZDROJE.md`, `apps/mobile/src/data/credits.ts`).

### P2: později
~~16. **Pohlednice z etapy** (otočná, sdílení obrázkem) a list atlasu za výpravu. Vzor `Pohlednice.dc.html`.~~ **Pohlednice hotová v balíku D (0022), na zařízení NEOVĚŘENO;** zbývá sdílení obrázkem a list atlasu za celou výpravu.
~~17. **Přívoz jako scéna** na trase (vzor `Privoz.dc.html`); trasa má přívozy v Podbabě, Libčicích a Lužci (jezdí sezónně).~~ **Hotovo v balíku D (0022), na zařízení NEOVĚŘENO.**
18. **Tmavý vzhled v novém stylu:** noční pergamen podle `*-noc.dc.html`, ale přes tokeny tématu, ne přes `noc.css`.
19. **Pozadí, widget, upozornění** (až po vyladění aplikace, viz návrh příloha A): Health Connect `READ_HEALTH_DATA_IN_BACKGROUND` + periodická úloha, HealthKit background delivery, widget, lokální upozornění na události (výchozí vypnuto).
20. ~~**Objevovat:** knihovna výprav~~ Hotovo (0021) s koncepty `verified: false` v `src/kronika/upcoming.ts`; **ověřit délky a popisy** Po Labi do Děčína, Krkonošská hřebenovka, Pěšky na Měsíc před vydáním.

## 5. Na co si dát pozor

- **Základ větví:** pracovní kopie pro agenty (git worktree) se zakládaly z neaktuální větve. Vždy ověřte `git log -1` a pracujte nad aktuálním `main`.
- **Fakta:** nic si nevymýšlet. Každé tvrzení musí mít zdroj v podkladech nebo nově doložený; nejistá formulovat opatrně („bývá označován“, „patrně“).
- **Texty** jsou česky, krátké, s háčkem a lehkým humorem; bez nátlaku, sérií a výčitek (principy ve `docs/specifikace.md`, kap. 4 a 10).
- **Expo:** před sahnutím na nativní API číst `apps/mobile/AGENTS.md` (verze SDK, `npx expo install`). Nové nativní moduly vyžadují nový build.
- **Data map** nejsou v gitu (R2, rozhodnutí 0013).
- **Prototyp na plátně** je zdroj pravdy pro vzhled a pohyb; `docs/mockupy/` je jeho kopie v repu (obrázky přes `assets/`).
