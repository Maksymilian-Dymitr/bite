import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { useDayMeals, useGoal } from "@/db/queries";
import { sum, fmt } from "@/lib/nutrition";
import { weekdayLabel } from "@/lib/dates";
import { ScaleTape } from "@/components/ScaleTape";
import { MacroLine } from "@/components/MacroLine";
import { MealRow } from "@/components/MealRow";
import { Button } from "@/components/Button";
import { color, space, type } from "@/theme";

export default function Today() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const meals = useDayMeals();
  const goal = useGoal();
  const eaten = sum(meals.filter((m) => m.status === "done").map((m) => m.totals));

  const target = goal?.kcal ?? 0;
  const left = target - eaten.kcal;
  const over = target > 0 && left < 0;

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }}>
        <Text style={[type.small, { fontSize: 15 }]}>{weekdayLabel()}</Text>

        {goal ? (
          <>
            <Text style={[type.readout, { marginTop: space.sm, color: over ? color.over : color.ink }]}>
              {fmt(Math.abs(left))}
            </Text>
            <Text style={[type.body, { color: color.muted }]}>
              {over ? "kcal over" : "kcal left"} of {fmt(target)}
            </Text>
            <View style={{ marginTop: space.md }}>
              <ScaleTape eaten={eaten.kcal} target={target} />
            </View>
            <View style={{ marginTop: space.lg, gap: space.sm }}>
              <MacroLine label="Protein" value={eaten.protein} target={goal.protein} tint={color.protein} />
              <MacroLine label="Carbs" value={eaten.carbs} target={goal.carbs} tint={color.carbs} />
              <MacroLine label="Fat" value={eaten.fat} target={goal.fat} tint={color.fat} />
            </View>
          </>
        ) : (
          <View style={{ marginTop: space.sm }}>
            <Text style={type.readout}>{fmt(eaten.kcal)}</Text>
            <Text style={[type.body, { color: color.muted }]}>kcal eaten today</Text>
            <Link href="/settings" style={[type.label, { color: color.readout, marginTop: space.md }]}>
              Set a daily target
            </Link>
          </View>
        )}

        <View style={{ marginTop: space.xl }}>
          <Text style={[type.heading, { marginBottom: space.xs }]}>Meals</Text>
          {meals.length === 0 ? (
            <Text style={[type.body, { color: color.muted, paddingVertical: space.md }]}>
              Nothing logged yet. Snap your first meal.
            </Text>
          ) : (
            meals.map((m) => <MealRow key={m.id} meal={m} />)
          )}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: space.md, flexDirection: "row", gap: space.sm }}>
        <Button title="Snap meal" onPress={() => router.push("/capture")} style={{ flex: 1, minHeight: 60, borderRadius: 30 }} />
        <Button
          title="Add"
          variant="quiet"
          accessibilityHint="Describe a meal, scan a barcode or log a meal again"
          onPress={() => router.push("/add")}
          style={{ minHeight: 60, borderRadius: 30, backgroundColor: color.counter }}
        />
      </View>
    </View>
  );
}
