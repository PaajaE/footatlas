import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { vltavska } from "../data/vltavska";
import { chapterStatus, chapterTagLabel } from "../kapitoly";
import { useExpedition } from "../state/ExpeditionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { T } from "./ui";

/** Malý štítek „Kapitola Voraři · 5/7“ v detailu místa; klepnutí otevře kapitolu. Bez kapitoly nic. */
export function ChapterTag({ placeId }: { placeId: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { walkedM, active } = useExpedition();
  const chapterId = vltavska.placesById.get(placeId)?.chapterId;
  const chapter = chapterId ? vltavska.chapters.find((c) => c.id === chapterId) : undefined;
  if (!chapter) return null;
  const label = chapterTagLabel(chapter, chapterStatus(chapter, vltavska.placesById, walkedM, active));
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint="Otevře kapitolu"
      onPress={() => router.push({ pathname: "/kapitola/[id]", params: { id: chapter.id } })}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{
        alignSelf: "flex-start",
        minHeight: 30,
        paddingHorizontal: 12,
        borderRadius: 999,
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.ochre,
        backgroundColor: colors.surface,
      }}
    >
      <T variant="small" style={{ fontSize: 13, lineHeight: 18, color: colors.ochre }}>
        {label} ›
      </T>
    </Pressable>
  );
}
