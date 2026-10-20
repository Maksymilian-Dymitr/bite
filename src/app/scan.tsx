import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { createMealWithItems } from "@/db/queries";
import { lookupBarcode, productItem } from "@/lib/barcode";
import { Button } from "@/components/Button";
import { color, space, type } from "@/theme";

type State = { kind: "scanning" } | { kind: "looking"; code: string } | { kind: "error"; message: string };

export default function Scan() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<State>({ kind: "scanning" });
  // The camera fires many events per second; only the first one counts.
  const locked = useRef(false);

  const onScan = async ({ data }: BarcodeScanningResult) => {
    if (locked.current) return;
    locked.current = true;
    Haptics.selectionAsync();
    setState({ kind: "looking", code: data });
    try {
      const product = await lookupBarcode(data);
      if (!product) {
        setState({ kind: "error", message: `Barcode ${data} isn't in Open Food Facts yet. Describe the meal instead.` });
        return;
      }
      const meal = await createMealWithItems({ eatenAt: Date.now(), note: null, items: [productItem(product)] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/meal/${meal.id}`);
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const again = () => {
    locked.current = false;
    setState({ kind: "scanning" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.counter, paddingTop: insets.top + space.md, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={type.title}>Scan barcode</Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[type.label, { color: color.muted }]}>Cancel</Text>
        </Pressable>
      </View>

      {!permission ? null : !permission.granted ? (
        <>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={[type.body, { color: color.muted }]}>
              {permission.canAskAgain
                ? "Bite needs the camera to read barcodes."
                : "Camera access is off. Turn it on in Android settings → Apps → Bite."}
            </Text>
          </View>
          {permission.canAskAgain && <Button title="Allow camera" onPress={requestPermission} />}
        </>
      ) : (
        <>
          <View style={{ marginTop: space.lg, width: "100%", aspectRatio: 1, borderRadius: 8, overflow: "hidden", backgroundColor: color.ink }}>
            {state.kind === "scanning" && (
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
                onBarcodeScanned={onScan}
              />
            )}
          </View>
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text style={[type.body, { color: state.kind === "error" ? color.over : color.muted, textAlign: "center" }]}>
              {state.kind === "scanning"
                ? "Point the camera at the barcode on the pack."
                : state.kind === "looking"
                  ? `Looking up ${state.code}…`
                  : state.message}
            </Text>
          </View>
          {state.kind === "error" && (
            <>
              <Button title="Scan again" onPress={again} />
              <Button title="Describe it instead" variant="quiet" onPress={() => router.replace("/add")} style={{ marginTop: space.sm }} />
            </>
          )}
        </>
      )}
    </View>
  );
}
