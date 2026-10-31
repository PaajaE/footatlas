const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Písma map (PBF) se přibalují jako soubory; dlaždice (PMTiles) se stahují ze serveru.
config.resolver.assetExts.push("pbf");

module.exports = config;
