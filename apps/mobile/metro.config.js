const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Mapová data se přibalují jako soubory: dlaždice (PMTiles) a písma (PBF).
config.resolver.assetExts.push("pmtiles", "pbf");

module.exports = config;
