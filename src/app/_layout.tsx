import { useEffect } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold } from "@expo-google-fonts/figtree";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";
import { db } from "@/db/client";
import { usePendingMeals } from "@/db/queries";
import { retryPending } from "@/lib/analyze";
import { color, font, space, type } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
  });
  const { success, error } = useMigrations(db, migrations);
  const ready = fontsLoaded && success;

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: color.counter, padding: space.lg, justifyContent: "center" }}>
        <Text style={type.heading}>The database couldn't open</Text>
        <Text style={[type.body, { marginTop: space.sm }]}>{error.message}</Text>
      </View>
    );
  }
  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <PendingRetry />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: color.counter },
          headerStyle: { backgroundColor: color.counter },
          headerShadowVisible: false,
          headerTintColor: color.ink,
          headerTitleStyle: { fontFamily: font.displayBold },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="capture" options={{ presentation: "fullScreenModal", headerShown: false }} />
        <Stack.Screen name="meal/[id]" options={{ title: "" }} />
      </Stack>
    </>
  );
}

/** On open, quietly retry meals that were captured but never analyzed (e.g. offline). */
function PendingRetry() {
  const pending = usePendingMeals();
  const ids = pending.filter((m) => m.status === "pending").map((m) => m.id);
  const key = ids.join(",");
  useEffect(() => {
    if (ids.length) retryPending(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
