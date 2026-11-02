import type { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Card, T } from "./ui";

/** Okrový popisek v IM Fell SC („Kam dnes dojdu?“, „Až tam jednou půjdete“). */
export function SectionLabel({ children, size = 14 }: { children: React.ReactNode; size?: number }) {
  const { colors, fonts } = useTheme();
  return (
    <T style={{ fontFamily: fonts.displaySC, fontSize: size, lineHeight: size + 6, letterSpacing: 0.6, color: colors.ochre }}>{children}</T>
  );
}

/** Karta s okrovým popiskem nahoře a obsahem pod ním. */
export function LabeledCard({
  label,
  children,
  style,
  gap = 8,
}: {
  label: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return (
    <Card style={[{ gap, padding: 14 }, style]}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </Card>
  );
}
