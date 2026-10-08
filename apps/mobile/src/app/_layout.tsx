import "@/i18n";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { CLERK_PUBLISHABLE_KEY } from "@/config";
import { colors } from "@/design";

// O ecrã de abertura fica até as fontes estarem prontas (sem "salto" de tipo de letra).
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  const ready = fontsLoaded || Boolean(fontError);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <View style={styles.outer}>
          {/* No navegador, limita a largura para simular um telemóvel. */}
          <View style={styles.frame}>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="welcome" />
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="design" />
            </Stack>
          </View>
        </View>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: Platform.OS === "web" ? "#E9E1D3" : colors.background,
    alignItems: "center",
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 430 : undefined,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
});
