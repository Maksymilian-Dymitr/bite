import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";

const dir = () => {
  const d = new Directory(Paths.document, "photos");
  d.create({ idempotent: true, intermediates: true });
  return d;
};

export type Snap = { path: string; base64: string };

/** Opens the camera (or library), returns a 1024px JPEG stored in the app's documents. */
export async function snap(source: "camera" | "library" = "camera"): Promise<Snap | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Camera access is off. Turn it on in Android settings → Apps → Bite.");
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return null;

  const rendered = await ImageManipulator.manipulate(res.assets[0].uri)
    .resize({ width: 1024, height: null })
    .renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });

  const target = new File(dir(), `${Date.now()}.jpg`);
  new File(saved.uri).move(target);
  return { path: target.uri, base64: saved.base64 ?? "" };
}

export async function readBase64(path: string): Promise<string> {
  return new File(path).base64();
}

/** Copies a meal photo so a repeated meal owns its own file (deleting one meal mustn't break the other). */
export function copyPhoto(path: string | null): string | null {
  if (!path) return null;
  const src = new File(path);
  if (!src.exists) return null;
  const target = new File(dir(), `${Date.now()}.jpg`);
  src.copy(target);
  return target.uri;
}

export function deletePhoto(path: string | null) {
  if (!path) return;
  const f = new File(path);
  if (f.exists) f.delete();
}
