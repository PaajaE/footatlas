/**
 * Zdroje a licence obrázků a dat (povinná atribuce). Fotky jsou z Wikimedia Commons, v aplikaci oříznuté do kruhu
 * (u zamčených míst i v odstínech šedi). Zdroj pravdy: docs/mockupy/assets/ZDROJE.md, před vydáním ověřit na stránkách souborů.
 */
export interface Credit {
  subject: string;
  author: string;
  license: string;
  url: string;
}

export const PHOTO_CREDITS: readonly Credit[] = [
  { subject: "Vyšehrad", author: "Godot13", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Czech-2013-Prague-Vyšehrad-Saints_Peter_and_Paul.JPG" },
  { subject: "Trojský zámek", author: "autor neuveden (ověřit)", license: "Free Art License", url: "https://commons.wikimedia.org/wiki/File:Prague_07-2016_Troja_Castle.jpg" },
  { subject: "Zámek Roztoky", author: "Stanislav Ferzik", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Roztoky_zamek_26012007.JPG" },
  { subject: "Levý Hradec", author: "Miaow Miaow", license: "volné dílo", url: "https://commons.wikimedia.org/wiki/File:Vltava_River_from_Levy_Hradec_CZ.JPG" },
  { subject: "Libčice nad Vltavou", author: "ŠJů", license: "CC BY-SA 3.0 (oříznuto)", url: "https://commons.wikimedia.org/wiki/File:Vltava_u_Libčic_a_Větrušice,_z_Liběhradu.jpg" },
  { subject: "Zámek Nelahozeves", author: "VitVit", license: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Zámek_Nelahozeves_6.JPG" },
  { subject: "Zámek Veltrusy", author: "Skot", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Veltrusy_(zámek),_pohled_z_jihu.jpg" },
  { subject: "Soutok v Mělníku", author: "Vvlasenko", license: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:Melnik_castle_above_the_confluence_of_the_rivers_Vltava_and_Labe,_Czech_Republic.JPG" },
];

export const DATA_CREDITS: readonly string[] = [
  "Mapa: data © přispěvatelé OpenStreetMap (licence ODbL), výřez ze sestavení Protomaps.",
  "Písma map: Noto Sans (licence SIL Open Font License).",
];
