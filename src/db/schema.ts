import { sqliteTable, integer, real, text, index } from "drizzle-orm/sqlite-core";

export const meals = sqliteTable(
  "meals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eatenAt: integer("eaten_at").notNull(), // unix ms
    photoPath: text("photo_path"), // null for text-only entries
    note: text("note"), // hint sent to Gemini
    status: text("status", { enum: ["pending", "done", "failed"] })
      .notNull()
      .default("pending"),
    error: text("error"), // last analysis error, shown on retry
  },
  (t) => [index("meals_eaten_at_idx").on(t.eatenAt)],
);

export const mealItems = sqliteTable(
  "meal_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mealId: integer("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    grams: real("grams").notNull(),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    confidence: real("confidence"), // Gemini's 0–1, null if manual
  },
  (t) => [index("meal_items_meal_id_idx").on(t.mealId)],
);

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  effectiveFrom: text("effective_from").notNull(), // 'YYYY-MM-DD'
  kcal: integer("kcal").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  fat: integer("fat").notNull(),
});

export const weights = sqliteTable("weights", {
  date: text("date").primaryKey(), // 'YYYY-MM-DD', one per day
  kg: real("kg").notNull(),
});

export type Meal = typeof meals.$inferSelect;
export type MealItem = typeof mealItems.$inferSelect;
export type NewMealItem = typeof mealItems.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type Weight = typeof weights.$inferSelect;
