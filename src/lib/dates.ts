/** Local-day helpers. All "days" are the phone's local calendar day. */

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function dayRange(d: Date = new Date()): [number, number] {
  const start = startOfDay(d);
  return [start, startOfDay(addDays(d, 1))];
}

export function timeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

export function weekdayLabel(d: Date = new Date()): string {
  const s = d.toLocaleDateString("en-GB", { weekday: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDay(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday: "narrow" });
}

export function mealLabel(ms: number): string {
  const h = new Date(ms).getHours();
  if (h < 11) return "Breakfast";
  if (h < 15) return "Lunch";
  if (h < 18) return "Snack";
  return "Dinner";
}
