import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { db } from "@/db/client";
import { goals, mealItems, meals, weights } from "@/db/schema";
import { dayKey } from "./dates";

const VERSION = 1;

/** Exports all data (not photos) as JSON and opens the share sheet — save it to Drive. */
export async function exportBackup() {
  const data = {
    app: "bite",
    version: VERSION,
    exportedAt: new Date().toISOString(),
    meals: await db.select().from(meals),
    mealItems: await db.select().from(mealItems),
    goals: await db.select().from(goals),
    weights: await db.select().from(weights),
  };
  const file = new File(Paths.cache, `bite-backup-${dayKey()}.json`);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(data));
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save Bite backup" });
}

/** Replaces all data with a backup file. Photos aren't in backups, so restored meals have no image. */
export async function importBackup(): Promise<number | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
  if (res.canceled) return null;
  const data = JSON.parse(await new File(res.assets[0].uri).text());
  if (data?.app !== "bite" || !Array.isArray(data.meals)) throw new Error("That file isn't a Bite backup.");

  await db.transaction(async (tx) => {
    await tx.delete(mealItems);
    await tx.delete(meals);
    await tx.delete(goals);
    await tx.delete(weights);
    if (data.meals.length) await tx.insert(meals).values(data.meals.map((m: any) => ({ ...m, photoPath: null })));
    if (data.mealItems.length) await tx.insert(mealItems).values(data.mealItems);
    if (data.goals.length) await tx.insert(goals).values(data.goals);
    if (data.weights.length) await tx.insert(weights).values(data.weights);
  });
  return data.meals.length;
}
