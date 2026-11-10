import { IMFellEnglish_400Regular, IMFellEnglish_400Regular_Italic } from "@expo-google-fonts/im-fell-english";
import { IMFellEnglishSC_400Regular } from "@expo-google-fonts/im-fell-english-sc";
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold } from "@expo-google-fonts/work-sans";
import { useFonts } from "expo-font";
import { Stack, useRootNavigationState, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ArrivalHost } from "../components/ArrivalHost";
import { ChronicleProvider } from "../db/ChronicleProvider";
import { ExpeditionProvider } from "../state/ExpeditionProvider";
import { OnboardingProvider } from "../state/OnboardingProvider";
import { useOnboardingGate } from "../state/useOnboardingGate";
import { ThemeProvider, useTheme, useThemeReady } from "../theme/ThemeProvider";

SplashScreen.preventAutoHideAsync();

/** Splash screen se skryje až po písmech, uložené volbě vzhledu a rozhodnutí o úvodu; jinak by blikla Výprava nebo světlé téma. */
const SPLASH_MAX_MS = 6000;

function Shell() {
  const theme = useTheme();
  const themeReady = useThemeReady();
  const decision = useOnboardingGate();
  const router = useRouter();
  const navReady = useRootNavigationState()?.key != null;
  const redirected = useRef(false);

  // Nový uživatel začíná úvodem (rozhodnutí 0035); přesměruje se jen jednou, i kdyby se podmínky později změnily.
  useEffect(() => {
    if (decision === "show" && navReady && !redirected.current) {
      redirected.current = true;
      router.replace("/onboarding");
    }
  }, [decision, navReady, router]);

  useEffect(() => {
    const ready = themeReady && navReady && (decision === "skip" || (decision === "show" && redirected.current));
    if (ready) void SplashScreen.hideAsync();
  }, [themeReady, navReady, decision]);

  useEffect(() => {
    const id = setTimeout(() => SplashScreen.hideAsync(), SPLASH_MAX_MS);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.name === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="zastavka/[id]" />
        <Stack.Screen name="kapitola/[id]" />
        <Stack.Screen name="delka-kroku" />
        <Stack.Screen name="zdroje" />
        <Stack.Screen name="nastaveni" />
        <Stack.Screen name="objevy" />
        <Stack.Screen name="karta-zivota" />
        <Stack.Screen name="navrat" options={{ animation: "fade" }} />
        <Stack.Screen name="pohlednice" />
        <Stack.Screen name="privoz" />
        <Stack.Screen name="dev" options={{ presentation: "modal" }} />
      </Stack>
      <ArrivalHost />
    </View>
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
        <OnboardingProvider>
          <ExpeditionProvider>
            <ChronicleProvider>
              <Shell />
            </ChronicleProvider>
          </ExpeditionProvider>
        </OnboardingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
