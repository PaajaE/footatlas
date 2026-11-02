import { IMFellEnglish_400Regular, IMFellEnglish_400Regular_Italic } from "@expo-google-fonts/im-fell-english";
import { IMFellEnglishSC_400Regular } from "@expo-google-fonts/im-fell-english-sc";
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from "@expo-google-fonts/work-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ChronicleProvider } from "../db/ChronicleProvider";
import { ExpeditionProvider } from "../state/ExpeditionProvider";
import { ThemeProvider, useTheme, useThemeReady } from "../theme/ThemeProvider";

SplashScreen.preventAutoHideAsync();

/** Skryje splash screen, až jsou písma i uložená volba vzhledu; jinak by při tmavé volbě blikl světlý. */
function SplashGate({ fontsDone }: { fontsDone: boolean }) {
  const themeReady = useThemeReady();
  useEffect(() => {
    if (fontsDone && themeReady) SplashScreen.hideAsync();
  }, [fontsDone, themeReady]);
  return null;
}

function Shell() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.name === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="zastavka/[id]" />
        <Stack.Screen name="delka-kroku" />
        <Stack.Screen name="zdroje" />
        <Stack.Screen name="nastaveni" />
        <Stack.Screen name="dev" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    IMFellEnglish_400Regular,
    IMFellEnglish_400Regular_Italic,
    IMFellEnglishSC_400Regular,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
  });

  // Při chybě načtení písem aplikace běží se systémovým písmem, ne s prázdnou obrazovkou.
  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SplashGate fontsDone={loaded || !!error} />
        <ExpeditionProvider>
          <ChronicleProvider>
            <Shell />
          </ChronicleProvider>
        </ExpeditionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
