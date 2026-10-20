import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { MealWithItems } from "@/db/queries";
import { timeLabel } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { color, hairline, space, type } from "@/theme";

export function MealRow({ meal }: { meal: MealWithItems }) {
  const router = useRouter();
  const names = meal.items.map((i) => i.name).join(", ");
  const subtitle =
    meal.status === "pending"
      ? meal.error
        ? "Not analyzed yet — retries when you're online"
        : meal.photoPath
          ? "Reading your plate…"
          : "Reading your description…"
      : meal.status === "failed"
        ? "Couldn't analyze — tap to retry"
        : names || "No items";

  return (
    <Pressable
      onPress={() => router.push(`/meal/${meal.id}`)}
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
      <Text style={[type.small, { width: 40, fontVariant: ["tabular-nums"] }]}>{timeLabel(meal.eatenAt)}</Text>
      {meal.photoPath ? (
        <Image source={{ uri: meal.photoPath }} style={{ width: 44, height: 44, borderRadius: 6 }} contentFit="cover" />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 6, backgroundColor: color.line }} />
      )}
      <Text
        numberOfLines={2}
        style={[type.label, { flex: 1, color: meal.status === "failed" ? color.over : meal.status === "pending" ? color.muted : color.ink }]}
      >
        {subtitle}
      </Text>
      <Text style={[type.number, { minWidth: 44, textAlign: "right" }]}>
        {meal.status === "done" ? fmt(meal.totals.kcal) : ""}
      </Text>
    </Pressable>
  );
}
