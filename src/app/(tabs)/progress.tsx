import { useState } from "react";
import { ScrollView, Text, TextInput, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Polyline, Rect, Text as SvgText } from "react-native-svg";
import { logWeight, useDailyTotals, useGoal, useWeights } from "@/db/queries";
import { shortDay } from "@/lib/dates";
import { fmt } from "@/lib/nutrition";
import { Button } from "@/components/Button";
import { color, font, space, type } from "@/theme";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export default function Progress() {
  const insets = useSafeAreaInsets();
  const days30 = useDailyTotals(30);
  const days7 = days30.slice(-7);
  const goal = useGoal();
  const weights = useWeights(60);

  const avg7 = avg(days7.filter((d) => d.logged).map((d) => d.kcal));
  const avg30 = avg(days30.filter((d) => d.logged).map((d) => d.kcal));

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg, paddingBottom: space.xl }}>
      <Text style={type.title}>Progress</Text>

      <Text style={[type.heading, { marginTop: space.lg }]}>Last 7 days</Text>
      <WeekBars days={days7} target={goal?.kcal} />

      <View style={{ flexDirection: "row", gap: space.xl, marginTop: space.md }}>
        <Stat value={avg7} label="7-day average" />
        <Stat value={avg30} label="30-day average" />
      </View>
      <Text style={[type.small, { marginTop: space.xs }]}>Averages count only days with something logged.</Text>

      <Text style={[type.heading, { marginTop: space.xl }]}>Weight</Text>
      <WeightEntry />
      {weights.length >= 2 ? (
        <WeightLine points={weights.map((w) => w.kg)} />
      ) : (
        <Text style={[type.body, { color: color.muted, marginTop: space.sm }]}>
          Log your weight on two days to see a trend.
        </Text>
      )}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View>
      <Text style={[type.heading, { fontVariant: ["tabular-nums"] }]}>{value ? fmt(value) : "–"}</Text>
      <Text style={type.small}>{label}</Text>
    </View>
  );
}

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)] as const;
}

function WeekBars({ days, target }: { days: { day: Date; kcal: number }[]; target?: number }) {
  const [width, onLayout] = useWidth();
  const H = 160;
  const LABEL = 20;
  const max = Math.max(target ?? 0, ...days.map((d) => d.kcal), 1) * 1.1;
  const slot = width / days.length;
  const barW = Math.min(28, slot * 0.5);
  const y = (v: number) => (H - LABEL) * (1 - v / max);

  return (
    <View onLayout={onLayout} style={{ height: H, marginTop: space.md }}>
      {width > 0 && (
        <Svg width={width} height={H}>
          {days.map((d, i) => {
            const x = i * slot + (slot - barW) / 2;
            const over = target ? d.kcal > target : false;
            return (
              <Rect
                key={i}
                x={x}
                y={y(d.kcal)}
                width={barW}
                height={Math.max(0, H - LABEL - y(d.kcal))}
                fill={over ? color.over : color.readout}
              />
            );
          })}
          {target ? (
            <Line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke={color.ink} strokeWidth={1} strokeDasharray="4 4" />
          ) : null}
          {days.map((d, i) => (
            <SvgText
              key={`l${i}`}
              x={i * slot + slot / 2}
              y={H - 4}
              fontSize={13}
              fontFamily={font.body}
              fill={color.muted}
              textAnchor="middle"
            >
              {shortDay(d.day)}
            </SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}

function WeightLine({ points }: { points: number[] }) {
  const [width, onLayout] = useWidth();
  const H = 120;
  const min = Math.min(...points) - 0.5;
  const max = Math.max(...points) + 0.5;
  const step = width / Math.max(1, points.length - 1);
  const pts = points.map((p, i) => `${i * step},${H - ((p - min) / (max - min)) * H}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const delta = last - first;

  return (
    <View style={{ marginTop: space.md }}>
      <Text style={[type.body, { color: color.muted }]}>
        <Text style={{ color: color.ink, fontFamily: font.bodySemi }}>{last.toFixed(1)} kg</Text>
        {`, ${delta <= 0 ? "down" : "up"} ${Math.abs(delta).toFixed(1)} kg over ${points.length} entries`}
      </Text>
      <View onLayout={onLayout} style={{ height: H, marginTop: space.sm }}>
        {width > 0 && (
          <Svg width={width} height={H}>
            <Polyline points={pts} fill="none" stroke={color.readout} strokeWidth={2.5} strokeLinejoin="round" />
          </Svg>
        )}
      </View>
    </View>
  );
}

function WeightEntry() {
  const [kg, setKg] = useState("");
  const [saved, setSaved] = useState(false);
  const value = Number(kg.replace(",", "."));
  const valid = isFinite(value) && value > 20 && value < 400;

  return (
    <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.sm, alignItems: "center" }}>
      <TextInput
        value={kg}
        onChangeText={(t) => {
          setKg(t);
          setSaved(false);
        }}
        placeholder="Today's weight, kg"
        placeholderTextColor={color.muted}
        keyboardType="decimal-pad"
        style={{
          flex: 1,
          backgroundColor: color.surface,
          borderRadius: 8,
          paddingHorizontal: space.md,
          paddingVertical: 14,
          fontFamily: font.body,
          fontSize: 17,
          color: color.ink,
        }}
      />
      <Button
        title={saved ? "Logged" : "Log weight"}
        disabled={!valid || saved}
        onPress={async () => {
          await logWeight(Math.round(value * 10) / 10);
          setSaved(true);
        }}
      />
    </View>
  );
}
