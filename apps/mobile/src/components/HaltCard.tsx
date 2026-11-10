import { useMemo } from "react";
import { Image, PanResponder, Pressable, View, type ImageSourcePropType } from "react-native";
import type { AppPlace } from "../data/vltavska";
import { shortSentence } from "../navrat";
import { sealKm, toRoman } from "../seal";
import { useTheme } from "../theme/ThemeProvider";
import { Seal } from "./Seal";
import { StageWax } from "./StageWax";
import { T } from "./ui";

export interface HaltCardProps {
  /** Místo zastavení; chybí, když etapa končí mimo místo. */
  place?: AppPlace;
  photo?: ImageSourcePropType;
  /** Index etapy, která tu končí: místo razítka místa dopadne pečeť etapy. */
  stageIndex?: number;
  expeditionName: string;
  dateLabel: string;
  /** Kolik zastavení zbývá (1 → 0); tenká linka dole. */
  remaining: number;
  /** Klepnutí na kartu (detail místa / pohlednice etapy). */
  onOpen: () => void;
  /** „Dál“: přeskočit zastavení. */
  onNext: () => void;
}

/**
 * Karta zastávky a konce etapy (rozhodnutí 0025, upraveno v 0033): fotka nebo razítko, typ a km (záhlaví se nikdy
 * neuřízne), název, jedna krátká věta. Razítko místa (nebo pečeť etapy) dopadne dovnitř karty, ne přes roh; karta je
 * nižší, aby nezakryla třetinu mapy. Přejetí doleva či dolů = „Dál“.
 */
export function HaltCard({ place, photo, stageIndex, expeditionName, dateLabel, remaining, onOpen, onNext }: HaltCardProps) {
  const { colors, fonts } = useTheme();
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 || g.dy > 12,
        onPanResponderRelease: (_e, g) => {
          if (g.dx < -40 || g.dy > 40 || g.dx > 40) onNext();
        },
      }),
    [onNext],
  );

  const roman = stageIndex !== undefined ? toRoman(stageIndex + 1) : undefined;
  const kindLabel = place ? (place.kind === "stop" ? "Zastávka" : "Objev") : `Etapa ${roman}`;
  // Záhlaví se nikdy neuřízne: typ a kilometr na jednom řádku, konec etapy na vlastním (zalomí se, když je úzko).
  const meta = [kindLabel, place ? sealKm(place.atM) : undefined].filter(Boolean).join(" · ");
  const stageLine = place && roman ? `konec etapy ${roman}` : undefined;
  const title = place?.name ?? `Etapa ${roman} dokončena`;
  const line = place ? shortSentence(place.hook ?? place.text, 120) : "Etapa je za vámi, pečeť dopadla.";
  const VISUAL = 72;
  const SEAL_SMALL = 40;

  // Razítko dopadne do karty (ne přes její roh): bez fotky je samo obrázkem karty, s fotkou leží v jejím rohu.
  const seal = (size: number) =>
    roman !== undefined && stageIndex !== undefined ? (
      <StageWax stageIndex={stageIndex} place={place} photo={photo} dateLabel={dateLabel} size={size} animate />
    ) : place?.kind === "stop" ? (
      <Seal kind="wax" size={size} animate name={place.name} kmLabel={sealKm(place.atM)} dateLabel={dateLabel} photo={photo} />
    ) : place ? (
      <Seal kind="stamp" size={size} animate name={place.name} expeditionName={expeditionName} kmLabel={sealKm(place.atM)} dateLabel={dateLabel} />
    ) : null;

  return (
    <View {...swipe.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${meta}${stageLine ? `, ${stageLine}` : ""}. ${title}. ${line ?? ""} Otevřít detail.`}
        accessibilityHint="Pozastaví přehrávání a otevře místo"
        onPress={onOpen}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 12,
          paddingBottom: 6,
          gap: 6,
          shadowColor: "#2B2118",
          shadowOpacity: 0.28,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ width: VISUAL, height: VISUAL, alignItems: "center", justifyContent: "center" }}>
            {photo ? (
              <>
                <Image source={photo} resizeMode="cover" style={{ width: VISUAL, height: VISUAL, borderRadius: 12 }} />
                <View pointerEvents="none" style={{ position: "absolute", right: -6, bottom: -6 }}>
                  {seal(SEAL_SMALL)}
                </View>
              </>
            ) : (
              seal(VISUAL)
            )}
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <T style={{ fontFamily: fonts.displaySC, fontSize: 13, letterSpacing: 0.6, color: colors.ochre }}>{meta}</T>
            {stageLine && <T style={{ fontFamily: fonts.displaySC, fontSize: 12, letterSpacing: 0.6, color: colors.accent }}>{stageLine}</T>}
            <T style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: colors.fg }}>{title}</T>
          </View>
        </View>
        {line && (
          <T style={{ fontFamily: fonts.displayItalic, fontSize: 15, lineHeight: 20, color: colors.fgSoft }}>{line}</T>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          {/* Zbývající čas zastavení. */}
          <View style={{ flex: 1, height: 2, backgroundColor: colors.line, borderRadius: 1, overflow: "hidden" }}>
            <View style={{ width: `${Math.max(0, Math.min(1, remaining)) * 100}%`, height: 2, backgroundColor: colors.accent }} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dál"
            onPress={onNext}
            hitSlop={8}
            style={{ minHeight: 36, minWidth: 56, justifyContent: "center", alignItems: "flex-end" }}
          >
            <T style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accent }}>Dál ›</T>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}
