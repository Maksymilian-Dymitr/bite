import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { snap, type Snap } from "@/lib/photos";
import { runAnalysis } from "@/lib/analyze";
import { createMeal } from "@/db/queries";
import { Button } from "@/components/Button";
import { color, font, space, type } from "@/theme";

export default function Capture() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [photo, setPhoto] = useState<Snap | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = async (source: "camera" | "library") => {
    setError(null);
    try {
      const s = await snap(source);
      if (s) setPhoto(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    take("camera");
  }, []);

  const analyze = async () => {
    if (!photo) return;
    setBusy(true);
    const meal = await createMeal({ eatenAt: Date.now(), photoPath: photo.path, note: hint.trim() || null });
    const ok = await runAnalysis(meal.id, photo.base64);
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    router.replace(`/meal/${meal.id}`);
  };

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1, backgroundColor: color.counter }}>
      <View style={{ flex: 1, paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={type.title}>New meal</Text>
          <Pressable onPress={() => router.back()} hitSlop={12} disabled={busy}>
            <Text style={[type.label, { color: color.muted }]}>Cancel</Text>
          </Pressable>
        </View>

        {photo ? (
          <>
            <Image
              source={{ uri: photo.path }}
              style={{ width: "100%", aspectRatio: 1, borderRadius: 8, marginTop: space.lg }}
              contentFit="cover"
            />
            <TextInput
              value={hint}
              onChangeText={setHint}
              editable={!busy}
              placeholder="Anything the photo doesn't show? e.g. fried in butter"
              placeholderTextColor={color.muted}
              style={{
                marginTop: space.md,
                backgroundColor: color.surface,
                borderRadius: 8,
                paddingHorizontal: space.md,
                paddingVertical: 14,
                fontFamily: font.body,
                fontSize: 17,
                color: color.ink,
              }}
            />
            <View style={{ flex: 1 }} />
            {busy && (
              <Text style={[type.body, { color: color.muted, textAlign: "center", marginBottom: space.md }]}>
                Reading your plate…
              </Text>
            )}
            <Button title="Analyze meal" busy={busy} onPress={analyze} />
            <Button title="Retake" variant="quiet" disabled={busy} onPress={() => take("camera")} style={{ marginTop: space.sm }} />
          </>
        ) : (
          <>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={[type.body, { color: error ? color.over : color.muted }]}>
                {error ?? "Take a photo of your plate from above, with the whole meal in frame."}
              </Text>
            </View>
            <Button title="Open camera" onPress={() => take("camera")} />
            <Button title="Choose from gallery" variant="quiet" onPress={() => take("library")} style={{ marginTop: space.sm }} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
