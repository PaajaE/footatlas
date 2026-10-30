import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";

type IconProps = { color: ColorValue };

const stroke = { fill: "none", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const HomeIcon = ({ color }: IconProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path d="M4 11l8-7 8 7v9H4z" stroke={color} {...stroke} />
  </Svg>
);
const MapIcon = ({ color }: IconProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z M9 4v14 M15 6v14" stroke={color} {...stroke} />
  </Svg>
);
const CompassIcon = ({ color }: IconProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={9} stroke={color} {...stroke} />
    <Path d="M15.5 8.5l-2 5-5 2 2-5z" stroke={color} {...stroke} />
  </Svg>
);
const BookIcon = ({ color }: IconProps) => (
  <Svg width={24} height={24} viewBox="0 0 24 24">
    <Path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z M5 17a3 3 0 013-3h11" stroke={color} {...stroke} />
  </Svg>
);

export default function TabLayout() {
  const { colors, fonts } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 12 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Domů", tabBarIcon: HomeIcon }} />
      <Tabs.Screen name="vyprava" options={{ title: "Výprava", tabBarIcon: MapIcon }} />
      <Tabs.Screen name="objevovat" options={{ title: "Objevovat", tabBarIcon: CompassIcon }} />
      <Tabs.Screen name="kronika" options={{ title: "Kronika", tabBarIcon: BookIcon }} />
    </Tabs>
  );
}
