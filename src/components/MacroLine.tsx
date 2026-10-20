import { Text, View } from "react-native";
import { color, font, space, type } from "@/theme";

type Props = { label: string; value: number; target?: number; tint: string };

export function MacroLine({ label, value, target, tint }: Props) {
  const pct = target ? Math.min(1, value / target) : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
      <Text style={[type.label, { width: 64 }]}>{label}</Text>
      <Text style={[type.number, { width: 84, color: color.muted }]}>
        <Text style={{ color: color.ink, fontFamily: font.bodySemi }}>{Math.round(value)}</Text>
        {target ? ` / ${target} g` : " g"}
      </Text>
      <View style={{ flex: 1, height: 4, backgroundColor: color.line }}>
        <View style={{ width: `${pct * 100}%`, height: 4, backgroundColor: tint }} />
      </View>
    </View>
  );
}
