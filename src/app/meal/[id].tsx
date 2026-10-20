import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { deleteMeal, replaceItems, useMeal } from "@/db/queries";
import { runAnalysis } from "@/lib/analyze";
import { deletePhoto } from "@/lib/photos";
import { mealLabel, timeLabel } from "@/lib/dates";
import { fmt, rescale, sum } from "@/lib/nutrition";
import { Button } from "@/components/Button";
import { color, font, hairline, space, type } from "@/theme";

type Draft = {
  key: string;
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number | null;
};

let keySeq = 0;
const newKey = () => `d${++keySeq}`;

export default function MealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mealId = Number(id);
  const meal = useMeal(mealId);
  const router = useRouter();

  const [items, setItems] = useState<Draft[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);

  // Seed the editable draft once the meal has items (or when a retry finishes).
  const sourceKey = meal ? `${meal.status}:${meal.items.map((i) => i.id).join(",")}` : "";
  useEffect(() => {
    if (!meal || meal.status !== "done") return;
    setItems(meal.items.map((i) => ({ ...i, key: newKey() })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey]);

  const totals = useMemo(() => sum(items ?? []), [items]);

  if (!meal) return <View style={{ flex: 1, backgroundColor: color.counter }} />;

  const update = (key: string, fn: (d: Draft) => Draft) =>
    setItems((prev) => prev?.map((d) => (d.key === key ? fn(d) : d)) ?? prev);

  const setGrams = (d: Draft, g: number) => update(d.key, (x) => rescale(x, Math.max(0, Math.round(g))));

  const retry = async () => {
    setRetrying(true);
    await runAnalysis(meal.id);
    setRetrying(false);
  };

  const save = async () => {
    if (!items) return;
    setSaving(true);
    await replaceItems(
      meal.id,
      items.filter((d) => d.name.trim()).map(({ key, ...rest }) => ({ ...rest, name: rest.name.trim() })),
    );
    router.back();
  };

  const remove = () =>
    Alert.alert("Delete this meal?", "The photo and its items will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMeal(meal.id);
          deletePhoto(meal.photoPath);
          router.back();
        },
      },
    ]);

  const addItem = () =>
    setItems((prev) => [
      ...(prev ?? []),
      { key: newKey(), name: "", grams: 100, kcal: 0, protein: 0, carbs: 0, fat: 0, confidence: null },
    ]);

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1, backgroundColor: color.counter }}>
      <Stack.Screen options={{ title: `${mealLabel(meal.eatenAt)}, ${timeLabel(meal.eatenAt)}` }} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        {meal.photoPath && (
          <Image source={{ uri: meal.photoPath }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 8 }} contentFit="cover" />
        )}
        {meal.note && <Text style={[type.small, { marginTop: space.sm }]}>Note: {meal.note}</Text>}

        {meal.status !== "done" ? (
          <View style={{ marginTop: space.lg, gap: space.md }}>
            <Text style={[type.body, { color: meal.status === "failed" ? color.over : color.muted }]}>
              {meal.status === "pending" || retrying ? "Reading your plate…" : meal.error}
            </Text>
            <Button title="Retry analysis" busy={retrying || meal.status === "pending"} onPress={retry} />
            <Button
              title="Enter items by hand"
              variant="quiet"
              onPress={() => {
                setItems([]);
                addItem();
              }}
            />
          </View>
        ) : null}

        {items && (
          <>
            <View style={{ marginTop: space.lg }}>
              {items.length === 0 && (
                <Text style={[type.body, { color: color.muted }]}>No food found in the photo. Add items by hand.</Text>
              )}
              {items.map((d) => (
                <ItemEditor
                  key={d.key}
                  item={d}
                  onName={(name) => update(d.key, (x) => ({ ...x, name }))}
                  onGrams={(g) => setGrams(d, g)}
                  onKcal={(kcal) => update(d.key, (x) => ({ ...x, kcal }))}
                  onRemove={() => setItems((prev) => prev?.filter((x) => x.key !== d.key) ?? prev)}
                />
              ))}
              <Pressable onPress={addItem} style={{ paddingVertical: space.md }}>
                <Text style={[type.label, { color: color.readout }]}>Add item</Text>
              </Pressable>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                borderTopWidth: 1,
                borderTopColor: color.ink,
                paddingTop: space.md,
              }}
            >
              <Text style={type.heading}>Total</Text>
              <Text style={[type.heading, { fontVariant: ["tabular-nums"] }]}>{fmt(totals.kcal)} kcal</Text>
            </View>
            <Text style={[type.small, { marginTop: space.xs }]}>
              Protein {Math.round(totals.protein)} g, carbs {Math.round(totals.carbs)} g, fat {Math.round(totals.fat)} g
            </Text>

            <Button title="Save meal" busy={saving} onPress={save} style={{ marginTop: space.xl }} />
          </>
        )}

        <Button title="Delete meal" variant="danger" onPress={remove} style={{ marginTop: space.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ItemEditor({
  item,
  onName,
  onGrams,
  onKcal,
  onRemove,
}: {
  item: Draft;
  onName: (v: string) => void;
  onGrams: (v: number) => void;
  onKcal: (v: number) => void;
  onRemove: () => void;
}) {
  const unsure = item.confidence !== null && item.confidence < 0.5;
  return (
    <View style={{ paddingVertical: space.md, borderBottomWidth: hairline, borderBottomColor: color.line, gap: space.sm }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <TextInput
          value={item.name}
          onChangeText={onName}
          placeholder="Food name"
          placeholderTextColor={color.muted}
          style={{ flex: 1, fontFamily: font.bodySemi, fontSize: 17, color: color.ink, padding: 0 }}
        />
        <Pressable onPress={onRemove} hitSlop={12} accessibilityLabel={`Remove ${item.name || "item"}`}>
          <Text style={[type.label, { color: color.muted }]}>Remove</Text>
        </Pressable>
      </View>
      {unsure && <Text style={[type.small, { color: color.carbs }]}>Portion is a rough guess — check the grams.</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
        <Step label="−" onPress={() => onGrams(item.grams - 10)} />
        <NumberField value={item.grams} onChange={onGrams} suffix="g" />
        <Step label="+" onPress={() => onGrams(item.grams + 10)} />
        <View style={{ flex: 1 }} />
        <NumberField value={item.kcal} onChange={onKcal} suffix="kcal" />
      </View>
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: color.line,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ fontFamily: font.bodySemi, fontSize: 20, color: color.ink }}>{label}</Text>
    </Pressable>
  );
}

function NumberField({ value, onChange, suffix }: { value: number; onChange: (n: number) => void; suffix: string }) {
  const [text, setText] = useState(String(Math.round(value)));
  useEffect(() => setText(String(Math.round(value))), [value]);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        backgroundColor: color.surface,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
      }}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={() => {
          const n = Number(text.replace(",", "."));
          if (isFinite(n) && n >= 0) onChange(n);
          else setText(String(Math.round(value)));
        }}
        keyboardType="numeric"
        selectTextOnFocus
        style={{ minWidth: 36, textAlign: "right", fontFamily: font.bodySemi, fontSize: 17, color: color.ink, padding: 0, fontVariant: ["tabular-nums"] }}
      />
      <Text style={type.small}>{suffix}</Text>
    </View>
  );
}
