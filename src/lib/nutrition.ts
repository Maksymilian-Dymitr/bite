export type Macros = { kcal: number; protein: number; carbs: number; fat: number };

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function sum(items: Macros[]): Macros {
  return items.reduce(
    (a, i) => ({
      kcal: a.kcal + i.kcal,
      protein: a.protein + i.protein,
      carbs: a.carbs + i.carbs,
      fat: a.fat + i.fat,
    }),
    ZERO,
  );
}

/** Rescale an item's macros to a new gram weight, keeping its density. */
export function rescale<T extends Macros & { grams: number }>(item: T, grams: number): T {
  if (item.grams <= 0) return { ...item, grams };
  const f = grams / item.grams;
  return {
    ...item,
    grams,
    kcal: item.kcal * f,
    protein: item.protein * f,
    carbs: item.carbs * f,
    fat: item.fat * f,
  };
}

export const round = (n: number) => Math.round(n);

/** "1 240" — thin-space thousands, like a scale display. */
export function fmt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
