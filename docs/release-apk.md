# Release APK mimo Google Play

Stav: 30. 10. 2026. Postup pro samostatné podepsané APK, které jde nainstalovat na telefon bez Google Play (rozhodnutí 0009).

## Sestavení

```bash
tools/release-apk.sh        # výstup: dist/footatlas-<verze>-<versionCode>.apk (složka dist/ není v gitu)
```

Mapa v APK není, stahuje se při prvním spuštění z R2 (`extra.apiBaseUrl` v `app.json` musí být nastaveno, rozhodnutí 0013). Skript smaže a znovu vygeneruje `apps/mobile/android` (`expo prebuild --clean`), sestaví `assembleRelease` jen pro `arm64-v8a` (jen arm64-v8a, nastaveno v `app.json` přes `buildArchs`; emulátory x86 se nepodporují) a vypíše otisk podpisu. Trvá kolem 3 minut (první build 7). Potřebuje JDK 17 a Android SDK (`ANDROID_HOME`, výchozí `~/Library/Android/sdk`).

Instalace do telefonu: `adb install -r dist/footatlas-1.0.0-1.apk`, nebo soubor přenést do telefonu a otevřít (povolit instalaci z neznámých zdrojů, Play Protect může chtít potvrzení).

## Podpis

- Vlastní klíč `~/.android-keys/footatlas-release.jks` (alias `footatlas`, RSA 2048, platnost 10 000 dní), hesla v `~/.gradle/gradle.properties` (`FOOTATLAS_KEYSTORE`, `FOOTATLAS_KEY_ALIAS`, `FOOTATLAS_STORE_PASSWORD`, `FOOTATLAS_KEY_PASSWORD`). Nic z toho není v repozitáři.
- Otisk SHA-256 certifikátu: `A2:BC:2B:C2:B9:82:DC:49:D8:31:C6:EC:13:9D:35:2C:35:7B:41:6F:ED:ED:07:4C:CD:CE:6B:B4:F3:ED:2C:E0`.
- **Klíč a hesla zálohujte mimo Mac (správce hesel).** Další verze se přes předchozí nainstaluje jen se stejným klíčem; při jeho ztrátě jde appku aktualizovat jen odinstalací, která smaže data v telefonu (kronika se z Health Connectu načte znovu, výprava, délka kroku a nastavení ne).
- Podpis do generované složky `android/` vkládá plugin `apps/mobile/plugins/withReleaseSigning.js`. Bez klíčů vyjde nepodepsané APK (nejde nainstalovat); build nikdy tiše nepoužije veřejný debug klíč. Plugin selže, pokud se změní tvar šablony `build.gradle`.

## Nová verze

Zvýšit `expo.android.versionCode` v `apps/mobile/app.json` (a podle potřeby `expo.version`), spustit skript, nainstalovat přes starší verzi.

## Co je ověřeno (30. 10. 2026, motorola edge 50 fusion, Android 16)

- APK podepsané vlastním klíčem (otisk výše), nainstalované, běží bez Metro serveru, bez odkazu „Vývoj“.
- Systémový dialog Health Connectu se v release buildu otevře a po udělení oprávnění se načte kronika: 332 km, 43 dní od 18. 9. 2026, shodně s vývojovým buildem (SQLite, Health Connect i přepočet z kroků fungují v release buildu).

## Neověřeno

- Výprava a kalibrace délky kroku v release buildu (kronika ověřena).
- Aktualizace přes starší release APK (jen jeden build zatím existuje).
- Mapa na reálném telefonu a na slabších zařízeních (na emulátoru Android 16 ověřena, viz níže).
- Telefony jiné než testovací; telefon bez Health Connectu.
- Odkaz „Délka kroku“ je jediná cesta k nastavení, diagnostika v release buildu není (obrazovka Podpora je v plánu).

## Testování na emulátoru

Na Macu s Apple Silicon běží emulátor arm64 nativně. Nastavení (jednorázově, 30. 10. 2026): příkazové nástroje Androidu do `~/Library/Android/sdk/cmdline-tools/latest`, obraz `system-images;android-36.1;google_apis_playstore;arm64-v8a`, zařízení `footatlas36` (Pixel 8, Android 16).

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
$ANDROID_HOME/emulator/emulator -avd footatlas36 -gpu host -no-snapshot -no-audio &
adb install -r dist/footatlas-1.2.0-3.apk
adb shell cmd uimode night yes   # tmavý režim
```

Vývojový build se stejným podpisem se instaluje přes release bez ztráty dat. Metro: `npx expo start --dev-client --port 8082` a `adb reverse tcp:8082 tcp:8082` (8081 může obsadit jiné okno). Ukázkový postup bez zdravotních dat: odkaz `footatlas:///dev` v telefonu a „Zapnout ukázkový postup“.

## Ověřeno na emulátoru (Android 16, arm64, 30. 10. 2026)

- Verze 1.2.0 (versionCode 3): medailony zastávek z APK, světlý i tmavý režim, obrazovka Zdroje a licence.
- Vývojový i release build: mapa se vykreslí z přibaleného souboru (čerstvá instalace, `pm clear`), české popisky z přibalených písem, den i noc, přepnutí přehled / poloha, klepnutí na místo otevře zastávku.
