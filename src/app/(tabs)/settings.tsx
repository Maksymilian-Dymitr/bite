import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setGoal, useGoal } from "@/db/queries";
import { DEFAULT_MODEL, getApiKey, getModel, setApiKey, setModel } from "@/lib/settings";
import { exportBackup, importBackup } from "@/lib/backup";
import { formatTime, getReminder, parseTime, setReminder } from "@/lib/reminder";
import { Button } from "@/components/Button";
import { color, font, space, type } from "@/theme";

export default function Settings() {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.lg, paddingBottom: space.xl, gap: space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={type.title}>Settings</Text>
        <Targets />
        <Gemini />
        <Reminder />
        <Backup />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text style={type.heading}>{title}</Text>
      {hint && <Text style={type.small}>{hint}</Text>}
      {children}
    </View>
  );
}

function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ flex: 1, gap: space.xs }}>
      <Text style={type.small}>{label}</Text>
      <TextInput
        placeholderTextColor={color.muted}
        {...props}
        style={{
          backgroundColor: color.surface,
          borderRadius: 8,
          paddingHorizontal: space.md,
          paddingVertical: 12,
          fontFamily: font.body,
          fontSize: 17,
          color: color.ink,
        }}
      />
    </View>
  );
}

function Targets() {
  const goal = useGoal();
  const [v, setV] = useState({ kcal: "", protein: "", carbs: "", fat: "" });
  const [saved, setSaved] = useState(false);

  // Seed the form whenever a (new) goal loads — adjusted during render rather than in an effect.
  const [seededId, setSeededId] = useState<number>();
  if (goal && goal.id !== seededId) {
    setSeededId(goal.id);
    setV({ kcal: String(goal.kcal), protein: String(goal.protein), carbs: String(goal.carbs), fat: String(goal.fat) });
  }

  const nums = { kcal: Number(v.kcal), protein: Number(v.protein), carbs: Number(v.carbs), fat: Number(v.fat) };
  const valid = Object.values(nums).every((n) => isFinite(n) && n >= 0) && nums.kcal > 0;
  const macroKcal = nums.protein * 4 + nums.carbs * 4 + nums.fat * 9;

  const set = (k: keyof typeof v) => (t: string) => {
    setV((p) => ({ ...p, [k]: t.replace(/[^0-9]/g, "") }));
    setSaved(false);
  };

  return (
    <Section title="Daily targets" hint="Changes apply from today. Past days keep their old targets.">
      <Field label="Calories, kcal" value={v.kcal} onChangeText={set("kcal")} keyboardType="number-pad" placeholder="2150" />
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Field label="Protein, g" value={v.protein} onChangeText={set("protein")} keyboardType="number-pad" />
        <Field label="Carbs, g" value={v.carbs} onChangeText={set("carbs")} keyboardType="number-pad" />
        <Field label="Fat, g" value={v.fat} onChangeText={set("fat")} keyboardType="number-pad" />
      </View>
      {valid && macroKcal > 0 && Math.abs(macroKcal - nums.kcal) > 100 && (
        <Text style={[type.small, { color: color.carbs }]}>
          Your macros add up to {Math.round(macroKcal)} kcal, not {nums.kcal}.
        </Text>
      )}
      <Button
        title={saved ? "Targets saved" : "Save targets"}
        disabled={!valid || saved}
        onPress={async () => {
          await setGoal(nums);
          setSaved(true);
        }}
      />
    </Section>
  );
}

function Gemini() {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [model, setModelText] = useState("");

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
    getModel().then((m) => setModelText(m === DEFAULT_MODEL ? "" : m));
  }, []);

  return (
    <Section
      title="Gemini"
      hint="Get a key at aistudio.google.com. It's stored encrypted on this phone and only sent to Google."
    >
      <Field
        label={hasKey ? "API key (saved — paste to replace)" : "API key"}
        value={key}
        onChangeText={setKey}
        placeholder={hasKey ? "••••••••••••" : "Paste your key"}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />
      <Field
        label="Model"
        value={model}
        onChangeText={setModelText}
        placeholder={DEFAULT_MODEL}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Button
        title="Save Gemini settings"
        onPress={async () => {
          if (key) await setApiKey(key);
          await setModel(model);
          setKey("");
          setHasKey(hasKey || !!key);
          Alert.alert("Saved");
        }}
      />
    </Section>
  );
}

function Reminder() {
  const [active, setActive] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getReminder().then((t) => {
      if (!t) return;
      setActive(formatTime(t));
      setTime(formatTime(t));
    });
  }, []);

  const parsed = parseTime(time);

  const apply = async (on: boolean) => {
    setBusy(true);
    try {
      const ok = await setReminder(on ? parsed : null);
      if (!ok) {
        Alert.alert("Notifications are off", "Allow notifications for Bite in Android settings to get a reminder.");
        setActive(null);
      } else setActive(on && parsed ? formatTime(parsed) : null);
    } catch (e) {
      Alert.alert("Couldn't set the reminder", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Daily reminder"
      hint={active ? `On — a nudge every day at ${active}.` : "Off. A gentle nudge in the evening to log what you ate."}
    >
      <Field
        label="Time, 24-hour"
        value={time}
        onChangeText={setTime}
        placeholder="20:30"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />
      <Button
        title={active ? "Update reminder" : "Turn on reminder"}
        busy={busy}
        disabled={!parsed || (active !== null && formatTime(parsed) === active)}
        onPress={() => apply(true)}
      />
      {active && <Button title="Turn off" variant="quiet" disabled={busy} onPress={() => apply(false)} />}
    </Section>
  );
}

function Backup() {
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  return (
    <Section
      title="Backup"
      hint="Your data lives only on this phone. Export a backup now and then and save it to Drive. Photos aren't included."
    >
      <Button
        title="Export backup"
        busy={busy === "export"}
        onPress={async () => {
          setBusy("export");
          try {
            await exportBackup();
          } catch (e) {
            Alert.alert("Export failed", e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(null);
          }
        }}
      />
      <Button
        title="Restore from backup"
        variant="quiet"
        busy={busy === "import"}
        onPress={() =>
          Alert.alert("Replace all data?", "Everything on this phone is replaced with the backup.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Restore",
              style: "destructive",
              onPress: async () => {
                setBusy("import");
                try {
                  const n = await importBackup();
                  if (n !== null) Alert.alert("Restored", `${n} meals restored.`);
                } catch (e) {
                  Alert.alert("Restore failed", e instanceof Error ? e.message : String(e));
                } finally {
                  setBusy(null);
                }
              },
            },
          ])
        }
      />
    </Section>
  );
}
