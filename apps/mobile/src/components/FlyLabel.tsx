import { Image, Pressable, View, type ImageSourcePropType } from "react-native";
import type { AppPlace } from "../data/vltavska";
import { shortSentence } from "../navrat";
import { sealKm } from "../seal";
import { useTheme } from "../theme/ThemeProvider";
import { Seal } from "./Seal";
import { T } from "./ui";

export interface FlyLabelProps {
  place: AppPlace;
  photo?: ImageSourcePropType;
  expeditionName: string;
  dateLabel: string;
  /** Nejvyšší výška štítku v bodech (25 % výšky obrazovky). */
  maxHeight: number;
  /** Klepnutí otevře místo (a pozastaví přehrání). */
  onOpen: () => void;
}

/**
 * Štítek místa za letu (rozhodnutí 0033): nahoře přes mapu, nejvýš čtvrtina výšky. Vlevo razítko místa (nebo fotka
 * s razítkem v rohu), vpravo typ a kilometr, název (dlouhý se zalomí, nic se neuřízne) a jedna krátká věta.
 * Let kvůli němu nezastaví; za 2,5 s ho vystřídá další místo nebo zmizí.
 */
export function FlyLabel({ place, photo, expeditionName, dateLabel, maxHeight, onOpen }: FlyLabelProps) {
  const { colors, fonts } = useTheme();
  const kind = place.kind === "stop" ? "Zastávka" : "Objev";
  const sentence = shortSentence(place.hook ?? place.text, 110);
  const VISUAL = 64;
  const seal =
    place.kind === "stop" ? (
      <Seal kind="wax" size={photo ? 34 : VISUAL} animate name={place.name} kmLabel={sealKm(place.atM)} dateLabel={dateLabel} photo={photo} />
    ) : (
      <Seal kind="stamp" size={photo ? 34 : VISUAL} animate name={place.name} expeditionName={expeditionName} kmLabel={sealKm(place.atM)} dateLabel={dateLabel} />
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${kind}, ${sealKm(place.atM)}. ${place.name}. ${sentence ?? ""} Otevřít místo.`}
      onPress={onOpen}
      style={{
        maxHeight,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: 10,
        paddingHorizontal: 12,
        overflow: "hidden",
        shadowColor: "#2B2118",
        shadowOpacity: 0.25,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
      }}
    >
      <View style={{ width: VISUAL, height: VISUAL, alignItems: "center", justifyContent: "center" }}>
        {photo ? (
          <>
            <Image source={photo} resizeMode="cover" style={{ width: VISUAL, height: VISUAL, borderRadius: 10 }} />
            <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -4 }}>
              {seal}
            </View>
          </>
        ) : (
          seal
        )}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <T style={{ fontFamily: fonts.displaySC, fontSize: 12, letterSpacing: 0.6, color: colors.ochre }}>{`${kind} · ${sealKm(place.atM)}`}</T>
        <T style={{ fontFamily: fonts.display, fontSize: 20, lineHeight: 23, color: colors.fg }}>{place.name}</T>
        {sentence && (
          <T style={{ fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 18, color: colors.fgSoft }}>{sentence}</T>
        )}
      </View>
    </Pressable>
  );
}
