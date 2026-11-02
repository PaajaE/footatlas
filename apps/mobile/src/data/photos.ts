import type { ImageSourcePropType } from "react-native";

/**
 * Fotky míst zabalené v aplikaci. Klíč je `photo` z expedition.json.
 * Autoři a licence jsou v `credits.ts`; místa bez fotky tu nejsou a obrazovky ukážou skicu s otazníkem.
 */
export const PLACE_PHOTOS: Record<string, ImageSourcePropType> = {
  vysehrad: require("../../assets/places/vysehrad.jpg"),
  "karluv-most": require("../../assets/places/karluv-most.jpg"),
  troja: require("../../assets/places/troja.jpg"),
  roztoky: require("../../assets/places/roztoky.jpg"),
  "vltava-levy-hradec": require("../../assets/places/levy-hradec.jpg"),
  libcice: require("../../assets/places/libcice.jpg"),
  nelahozeves2: require("../../assets/places/nelahozeves.jpg"),
  veltrusy: require("../../assets/places/veltrusy.jpg"),
  melnik: require("../../assets/places/melnik.jpg"),
};

export function placePhoto(key: string | undefined): ImageSourcePropType | undefined {
  return key ? PLACE_PHOTOS[key] : undefined;
}
