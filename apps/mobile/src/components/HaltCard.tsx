import { useMemo } from "react";
import { Image, PanResponder, Pressable, View, type ImageSourcePropType } from "react-native";
import type { AppPlace } from "../data/vltavska";
import { firstSentence } from "../navrat";
import { sealKm, toRoman } from "../seal";
import { useTheme } from "../theme/ThemeProvider";
import { Seal } from "./Seal";
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
 * Karta místa při zastavení v návratu (rozhodnutí 0025): fotka (nebo kreslený rámeček se jménem), typ a km, název
 * a jedna věta háčku. Razítko místa (nebo pečeť etapy) na kartu dopadne při jejím vyjetí. Přejetí doleva či dolů = „Dál“.
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
  const meta = [kindLabel, place ? sealKm(place.atM) : undefined, place && roman ? `konec etapy ${roman}` : undefined]
    .filter(Boolean)
    .join(" · ");
  const title = place?.name ?? `Etapa ${roman} dokončena`;
  const line = place ? firstSentence(place.hook) ?? firstSentence(place.text) : "Etapa je za vámi, pečeť dopadla.";
  const SEAL = 68;

  return (
    <View {...swipe.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${meta}. ${title}. ${line ?? ""} Otevřít detail.`}
        accessibilityHint="Pozastaví přehrávání a otevře místo"
        onPress={onOpen}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: colors.line,
          padding: 14,
          paddingBottom: 10,
          gap: 10,
          shadowColor: "#2B2118",
          shadowOpacity: 0.28,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        }}
      >
        <View style={{ flexDirection: "row", gap: 12 }}>
          {photo ? (
            <Image source={photo} resizeMode="cover" style={{ width: 92, height: 92, borderRadius: 12 }} />
          ) : (
            <DrawnFrame name={place?.name ?? `Etapa ${roman}`} />
          )}
          <View style={{ flex: 1, gap: 2, paddingRight: SEAL - 18 }}>
            <T style={{ fontFamily: fonts.displaySC, fontSize: 13, letterSpacing: 0.6, color: colors.ochre }} numberOfLines={1}>
              {meta}
            </T>
            <T style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.fg }} numberOfLines={2}>
              {title}
            </T>
          </View>
        </View>
        {line && (
          <T style={{ fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 21, color: colors.fgSoft }} numberOfLines={3}>
            {line}
          </T>
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
      {/* Razítko dopadne na kartu (pravý horní roh, přes okraj). */}
      <View pointerEvents="none" style={{ position: "absolute", right: 8, top: -SEAL / 3 }}>
        {roman !== undefined ? (
          <Seal kind="stage" size={SEAL} animate roman={roman} ringText={`ETAPA ${roman} · ${expeditionName} ·`} />
        ) : place?.kind === "stop" ? (
          <Seal kind="wax" size={SEAL} animate name={place.name} kmLabel={sealKm(place.atM)} dateLabel={dateLabel} photo={photo} />
        ) : place ? (
          <Seal kind="stamp" size={SEAL} animate name={place.name} expeditionName={expeditionName} kmLabel={sealKm(place.atM)} dateLabel={dateLabel} />
        ) : null}
      </View>
    </View>
  );
}

/** Místo bez fotky: kreslený rámeček (dvojitá tužková linka) se jménem. */
function DrawnFrame({ name }: { name: string }) {
  const { colors, fonts } = useTheme();
  return (
    <View style={{ width: 92, height: 92, borderRadius: 4, borderWidth: 1.5, borderColor: colors.fgSoft, padding: 3, transform: [{ rotate: "-1.5deg" }] }}>
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: colors.fgSoft,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4,
          backgroundColor: colors.ochre + "14",
        }}
      >
        <T style={{ fontFamily: fonts.displayItalic, fontSize: 14, lineHeight: 17, color: colors.fg, textAlign: "center" }} numberOfLines={4}>
          {name}
        </T>
      </View>
    </View>
  );
}
