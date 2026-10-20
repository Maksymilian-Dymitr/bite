import { StyleSheet, type TextStyle } from "react-native";

export const color = {
  counter: "#E9ECE8", // background — matte appliance grey
  surface: "#F6F7F4", // sheets, inputs
  ink: "#1E2522",
  muted: "#66706B",
  line: "#C9CFC9",
  readout: "#2E5E4E", // bottle green
  readoutSoft: "#D6E2DC",
  over: "#C23B4E", // raspberry, only when over target
  protein: "#2F6DB5",
  carbs: "#C9971F",
  fat: "#7C5BA6",
  white: "#FFFFFF",
} as const;

export const font = {
  display: "BricolageGrotesque_800ExtraBold",
  displayBold: "BricolageGrotesque_700Bold",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_500Medium",
  bodySemi: "Figtree_600SemiBold",
} as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

const tab: TextStyle = { fontVariant: ["tabular-nums"] };

export const type = StyleSheet.create({
  readout: { ...tab, fontFamily: font.display, fontSize: 88, lineHeight: 92, color: color.ink, letterSpacing: -2 },
  title: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 40, color: color.ink, letterSpacing: -0.5 },
  heading: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 28, color: color.ink },
  body: { fontFamily: font.body, fontSize: 17, lineHeight: 24, color: color.ink },
  label: { fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.ink },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted },
  number: { ...tab, fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20, color: color.ink },
});

export const hairline = StyleSheet.hairlineWidth;
