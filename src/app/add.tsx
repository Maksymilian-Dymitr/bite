import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { copyMeal, createMeal, useRepeatable, type MealWithItems } from "@/db/queries";
import { runAnalysis } from "@/lib/analyze";
import { copyPhoto } from "@/lib/photos";
import { fmt } from "@/lib/nutrition";
import { Button } from "@/components/Button";
import { color, font, hairline, space, type } from "@/theme";

/** Every way to log a meal that isn't a photo: describe it, scan a pack, or repeat one. */
export default function Add() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { favorites, recent } = useRepeatable();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const estimate = async () => {
    const note = text.trim();
    if (!note) return;
    setBusy(true);
    const meal = await createMeal({ eatenAt: Date.now(), photoPath: null, note });
    const ok = await runAnalysis(meal.id);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    router.replace(`/meal/${meal.id}`);
  };

  const repeat = async (m: MealWithItems) => {
    try {
      const meal = await copyMeal(m.id, copyPhoto(m.photoPath));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/meal/${meal.id}`);
    } catch (e) {
      Alert.alert("Couldn't log it", e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1, backgroundColor: color.counter }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={type.title}>Add a meal</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} disabled={busy}>
            <Text style={[type.label, { color: color.muted }]}>Cancel</Text>
          </Pressable>
        </View>

        <Text style={[type.heading, { marginTop: space.lg }]}>Describe it</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          editable={!busy}
          multiline
          placeholder="e.g. two fried eggs, a slice of rye bread with butter, black coffee"
          placeholderTextColor={color.muted}
          style={{
            marginTop: space.sm,
            minHeight: 96,
            textAlignVertical: "top",
            backgroundColor: color.surface,
            borderRadius: 8,
            paddingHorizontal: space.md,
            paddingVertical: 14,
            fontFamily: font.body,
            fontSize: 17,
            color: color.ink,
          }}
        />
        {busy && (
          <Text style={[type.body, { color: color.muted, textAlign: "center", marginTop: space.md }]}>
            Reading your description…
          </Text>
        )}
        <Button title="Estimate" busy={busy} disabled={!text.trim()} onPress={estimate} style={{ marginTop: space.md }} />
        <Button
          title="Scan a barcode"
          variant="quiet"
          disabled={busy}
          onPress={() => router.replace("/scan")}
          style={{ marginTop: space.sm }}
        />

        {favorites.length > 0 && <RepeatList title="Favorites" meals={favorites} onPick={repeat} disabled={busy} />}
        {recent.length > 0 && <RepeatList title="Log again" meals={recent} onPick={repeat} disabled={busy} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RepeatList({
  title,
  meals,
  onPick,
  disabled,
}: {
  title: string;
  meals: MealWithItems[];
  onPick: (m: MealWithItems) => void;
  disabled: boolean;
}) {
  return (
    <View style={{ marginTop: space.xl }}>
      <Text style={[type.heading, { marginBottom: space.xs }]}>{title}</Text>
      {meals.map((m) => (
        <Pressable
          key={m.id}
          disabled={disabled}
          onPress={() => onPick(m)}
          accessibilityRole="button"
          accessibilityHint="Logs this meal again now"
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: space.md,
            paddingVertical: 12,
            borderBottomWidth: hairline,
            borderBottomColor: color.line,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {m.photoPath ? (
            <Image source={{ uri: m.photoPath }} style={{ width: 44, height: 44, borderRadius: 6 }} contentFit="cover" />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: color.line }} />
          )}
          <Text numberOfLines={2} style={[type.label, { flex: 1 }]}>
            {m.items.map((i) => i.name).join(", ")}
          </Text>
          <Text style={[type.number, { minWidth: 44, textAlign: "right" }]}>{fmt(m.totals.kcal)}</Text>
        </Pressable>
      ))}
    </View>
  );
}
