import { getApiKey, getModel } from "./settings";

export type AnalyzedItem = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
};

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short food name, e.g. 'Chicken thigh, grilled'" },
          grams: { type: "number", description: "Estimated edible weight as served, in grams" },
          kcal: { type: "number" },
          protein: { type: "number", description: "grams" },
          carbs: { type: "number", description: "grams" },
          fat: { type: "number", description: "grams" },
          confidence: { type: "number", description: "0 to 1" },
        },
        required: ["name", "grams", "kcal", "protein", "carbs", "fat", "confidence"],
      },
    },
  },
  required: ["items"],
};

const PROMPT = `You estimate the nutrition of a meal from a photo.
List each distinct food you can see as its own item.
- Estimate the cooked, as-served weight in grams from visual cues (plate size, cutlery, hands).
- List visible oils, butter, sauces and dressings as separate items; if food is clearly fried or glossy, add a cooking-fat item.
- Drinks count if they are in the photo.
- Use typical nutrition values per 100 g for the food as prepared.
- confidence reflects how sure you are about the portion, not the food name.
If there is no food in the photo, return an empty items array.`;

export class GeminiError extends Error {}

export async function analyzeMeal(base64Jpeg: string, hint?: string | null): Promise<AnalyzedItem[]> {
  const key = await getApiKey();
  if (!key) throw new GeminiError("Add your Gemini API key in Settings to analyze photos.");
  const model = await getModel();

  const input: unknown[] = [
    { type: "text", text: PROMPT + (hint ? `\n\nNote from the person who ate it: ${hint}` : "") },
    { type: "image", data: base64Jpeg, mime_type: "image/jpeg" },
  ];

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  let res: Response;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        model,
        input,
        response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new GeminiError(
      ctrl.signal.aborted ? "Gemini took too long to answer. Try again." : "No connection. The photo is saved — retry when you're online.",
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 400 && /api key/i.test(msg)) throw new GeminiError("Gemini rejected the API key. Check it in Settings.");
    if (res.status === 429) throw new GeminiError("Gemini rate limit hit. Wait a minute and retry.");
    throw new GeminiError(`Gemini error: ${msg}`);
  }

  const text = extractText(body);
  if (!text) throw new GeminiError("Gemini returned an empty answer. Try again.");
  let parsed: { items?: AnalyzedItem[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError("Gemini's answer wasn't valid JSON. Try again.");
  }
  return (parsed.items ?? []).map(clean).filter((i) => i.grams > 0 || i.kcal > 0);
}

/** The Interactions API returns `output_text`; fall back to walking `outputs` in case the shape shifts. */
function extractText(body: any): string | null {
  if (typeof body?.output_text === "string") return body.output_text;
  const outputs: any[] = body?.outputs ?? body?.output ?? [];
  for (const o of outputs.slice().reverse()) {
    if (typeof o?.text === "string") return o.text;
    for (const c of o?.content ?? []) if (typeof c?.text === "string") return c.text;
  }
  return null;
}

const n = (v: unknown) => (typeof v === "number" && isFinite(v) && v > 0 ? v : 0);

function clean(i: AnalyzedItem): AnalyzedItem {
  return {
    name: String(i.name ?? "Food").slice(0, 80),
    grams: Math.round(n(i.grams)),
    kcal: n(i.kcal),
    protein: n(i.protein),
    carbs: n(i.carbs),
    fat: n(i.fat),
    confidence: Math.min(1, n(i.confidence)),
  };
}
