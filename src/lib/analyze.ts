import { analyzeMeal } from "./gemini";
import { readBase64 } from "./photos";
import { getMeal, setMealFailed, setMealResult } from "@/db/queries";

/** Runs Gemini for a stored meal and writes the result. Never throws — failures are saved on the meal. */
export async function runAnalysis(mealId: number, base64?: string): Promise<boolean> {
  const meal = await getMeal(mealId);
  if (!meal?.photoPath) return false;
  try {
    const data = base64 ?? (await readBase64(meal.photoPath));
    const items = await analyzeMeal(data, meal.note);
    await setMealResult(mealId, items);
    return true;
  } catch (e) {
    await setMealFailed(mealId, e instanceof Error ? e.message : String(e));
    return false;
  }
}

let running = false;

/** Retry every pending/failed meal. Called on app open. */
export async function retryPending(ids: number[]) {
  if (running) return;
  running = true;
  try {
    for (const id of ids) await runAnalysis(id);
  } finally {
    running = false;
  }
}
