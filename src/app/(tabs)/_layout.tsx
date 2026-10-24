import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, font, hairline } from "@/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: color.counter },
        tabBarStyle: {
          backgroundColor: color.counter,
          borderTopWidth: hairline,
          borderTopColor: color.line,
          elevation: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: "none" },
        tabBarLabelStyle: { fontFamily: font.bodySemi, fontSize: 15 },
        tabBarActiveTintColor: color.readout,
        tabBarInactiveTintColor: color.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
