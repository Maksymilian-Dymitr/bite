import { useSyncExternalStore } from "react";
import { analyzeMeal, GeminiError } from "./gemini";
import { readBase64 } from "./photos";
import { getMeal, setMealFailed, setMealResult, setMealWaiting } from "@/db/queries";

/** Meals with an analysis in flight. Shared so the capture screen and the open-retry never analyze the same meal twice. */
const inFlight = new Map<number, Promise<boolean>>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** True while Gemini is working on this meal. */
export function useAnalyzing(mealId: number) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => inFlight.has(mealId),
  );
}

/**
 * Runs Gemini for a stored meal (photo, or text-only note) and writes the result.
 * Never throws — failures are saved on the meal. Retryable failures leave it pending for the next retry.
 */
export function runAnalysis(mealId: number, base64?: string): Promise<boolean> {
  const running = inFlight.get(mealId);
  if (running) return running;
  const p = analyze(mealId, base64).finally(() => {
    inFlight.delete(mealId);
    emit();
  });
  inFlight.set(mealId, p);
  emit();
  return p;
}

async function analyze(mealId: number, base64?: string): Promise<boolean> {
  const meal = await getMeal(mealId);
  if (!meal || (!meal.photoPath && !meal.note)) return false;
  try {
    const data = meal.photoPath ? (base64 ?? (await readBase64(meal.photoPath))) : null;
    const items = await analyzeMeal({ base64Jpeg: data, text: meal.note });
    await setMealResult(mealId, items);
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (e instanceof GeminiError && e.retryable) await setMealWaiting(mealId, message);
    else await setMealFailed(mealId, message);
    return false;
  }
}

let running = false;

/** Retry every pending meal, one at a time. Called on app open and when the app comes back to the foreground. */
export async function retryPending(ids: number[]) {
  if (running) return;
  running = true;
  try {
    for (const id of ids) await runAnalysis(id);
  } finally {
    running = false;
  }
}
