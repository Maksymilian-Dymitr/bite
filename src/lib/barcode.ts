import type { NewMealItem } from "@/db/schema";

/** A packaged food from Open Food Facts, with values per 100 g. */
export type Product = {
  code: string;
  name: string;
  servingGrams: number | null;
  per100: { kcal: number; protein: number; carbs: number; fat: number };
};

const num = (v: unknown) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && isFinite(n) && n >= 0 ? n : null;
};

/** Looks a barcode up on Open Food Facts. Returns null when the product isn't listed. */
export async function lookupBarcode(code: string): Promise<Product | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity`,
      { headers: { "User-Agent": "Bite/1.0 (Android)" }, signal: ctrl.signal },
    );
  } catch {
    throw new Error(ctrl.signal.aborted ? "Open Food Facts took too long to answer." : "No connection. Barcode lookup needs the internet.");
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts error (HTTP ${res.status}).`);

  const body = await res.json().catch(() => null);
  const p = body?.status === 1 ? body.product : null;
  if (!p) return null;

  const n = p.nutriments ?? {};
  const kj = num(n["energy_100g"]);
  const kcal = num(n["energy-kcal_100g"]) ?? (kj !== null ? kj / 4.184 : null);
  if (kcal === null) throw new Error("Found the product, but it has no nutrition facts listed.");

  const brand = typeof p.brands === "string" ? p.brands.split(",")[0].trim() : "";
  const name = (typeof p.product_name === "string" && p.product_name.trim()) || "Scanned product";
  return {
    code,
    name: (brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${name}, ${brand}` : name).slice(0, 80),
    servingGrams: num(p.serving_quantity) || null,
    per100: {
      kcal,
      protein: num(n["proteins_100g"]) ?? 0,
      carbs: num(n["carbohydrates_100g"]) ?? 0,
      fat: num(n["fat_100g"]) ?? 0,
    },
  };
}

/** One serving (or 100 g when the pack doesn't say) as a meal item. */
export function productItem(p: Product): Omit<NewMealItem, "mealId"> {
  const grams = Math.round(p.servingGrams ?? 100);
  const f = grams / 100;
  return {
    name: p.name,
    grams,
    kcal: p.per100.kcal * f,
    protein: p.per100.protein * f,
    carbs: p.per100.carbs * f,
    fat: p.per100.fat * f,
    confidence: null,
  };
}
