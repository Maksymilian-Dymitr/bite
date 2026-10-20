import { ActivityIndicator, Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { color, font } from "@/theme";

type Props = Omit<PressableProps, "style"> & {
  title: string;
  variant?: "primary" | "quiet" | "danger";
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = "primary", busy, disabled, style, ...rest }: Props) {
  const primary = variant === "primary";
  const fg = primary ? color.white : variant === "danger" ? color.over : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      style={({ pressed }) => [
        {
          minHeight: 52,
          paddingHorizontal: 22,
          borderRadius: 26,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primary ? color.readout : "transparent",
          borderWidth: primary ? 0 : 1,
          borderColor: variant === "danger" ? color.over : color.line,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        },
        style,
      ]}
      {...rest}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: font.bodySemi, fontSize: 17, color: fg }}>{title}</Text>
      )}
    </Pressable>
  );
}
