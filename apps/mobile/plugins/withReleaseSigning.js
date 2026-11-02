const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Release (a debug) build podepisuje vlastní klíč, ne veřejně známý debug klíč ze šablony.
 * Cesta ke klíči a hesla se čtou z vlastností Gradle (`~/.gradle/gradle.properties`), nikdy z repozitáře:
 *   FOOTATLAS_KEYSTORE, FOOTATLAS_KEY_ALIAS, FOOTATLAS_STORE_PASSWORD, FOOTATLAS_KEY_PASSWORD
 * Bez nich vyjde nepodepsané APK, které nejde nainstalovat; build tedy nikdy tiše nepoužije debug klíč.
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes("FOOTATLAS_KEYSTORE")) return cfg;

    const releaseSigning = `
        release {
            if (findProperty('FOOTATLAS_KEYSTORE')) {
                storeFile file(findProperty('FOOTATLAS_KEYSTORE'))
                storePassword findProperty('FOOTATLAS_STORE_PASSWORD')
                keyAlias findProperty('FOOTATLAS_KEY_ALIAS')
                keyPassword findProperty('FOOTATLAS_KEY_PASSWORD')
            }
        }`;
    const withSigningConfig = src.replace(/(signingConfigs \{\s*debug \{[\s\S]*?\n\s{8}\})/, `$1${releaseSigning}`);
    const withBuildType = withSigningConfig.replace(
      /(release \{\s*\/\/ Caution![^\n]*\n\s*\/\/ see [^\n]*\n\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig findProperty('FOOTATLAS_KEYSTORE') ? signingConfigs.release : null",
    );
    // Debug build se podepisuje stejným klíčem (je-li k dispozici), aby se vývojový build instaloval přes release
    // bez odinstalace, tedy bez ztráty dat v telefonu.
    const withDebug = withBuildType.replace(
      /(buildTypes \{\s*debug \{\s*)signingConfig signingConfigs\.debug/,
      "$1signingConfig findProperty('FOOTATLAS_KEYSTORE') ? signingConfigs.release : signingConfigs.debug",
    );
    if (withBuildType === withSigningConfig || withSigningConfig === src || withDebug === withBuildType) {
      throw new Error("withReleaseSigning: šablona app/build.gradle má jiný tvar, plugin je potřeba upravit.");
    }
    cfg.modResults.contents = withDebug;
    return cfg;
  });
};
