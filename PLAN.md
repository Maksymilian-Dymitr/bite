# Bite — plan

Snap a meal, Gemini estimates it, you correct the grams, it's logged. Everything lives on the phone.

Working name: **Bite** (rename in `app.json` → `name`, `slug`, `scheme`).

## Product

**Primary job:** answer "how much do I have left today?" in one glance, and make logging a meal one tap.

**Core loop:** Snap → analyze → correct grams → save → today updates.

**Non-goals (for now):** accounts, sync, social, recipes, micronutrients.

## Stack

| Concern | Choice |
| --- | --- |
| App | Expo SDK 58, TypeScript, expo-router (`src/app`) |
| Data | expo-sqlite + Drizzle (`useLiveQuery`, migrations in `drizzle/`) |
| Photos | expo-image-picker (camera) → expo-image-manipulator (1024px JPEG) → `Documents/photos/` |
| AI | Gemini Interactions API, called from the phone, structured JSON output |
| Secrets | API key in expo-secure-store |
| Backup | JSON export via expo-sharing, import via expo-document-picker |
| Fonts | Bricolage Grotesque (numbers, headings), Figtree (body) |

## Design direction: "kitchen scale"

The app is a scale readout, not a fitness dashboard. Calm, matte, cool surfaces; one loud element.

**Color**

| Token | Hex | Use |
| --- | --- | --- |
| counter | `#E9ECE8` | background — cool matte grey, like an appliance surface |
| surface | `#F6F7F4` | sheets, inputs |
| ink | `#1E2522` | text (green-black) |
| muted | `#66706B` | secondary text |
| line | `#C9CFC9` | hairlines, empty ticks |
| readout | `#2E5E4E` | bottle green — remaining number, filled ticks, primary button |
| over | `#C23B4E` | raspberry — only when over target |
| protein / carbs / fat | `#2F6DB5` / `#C9971F` / `#7C5BA6` | macro marks only |

**Type**
- Bricolage Grotesque 700/800 for readout numbers and screen titles, tabular figures.
- Figtree 400/500/600 for everything else.
- Scale: 13 / 15 / 17 / 22 / 34 / 88.
- Sentence case everywhere. No all-caps labels, no monospace.

**The one memorable thing — the scale tape.** Under the big remaining number, a ruler of ticks (one tick = 50 kcal of target). Eaten ticks fill green; ticks past the target turn raspberry. Every 500 kcal gets a taller tick. Nothing else on screen competes with it: no cards, no shadows, no gradients — hairline dividers only.

**Motion:** one moment only — after saving a meal, the tape fills to its new position. Respect reduced motion.

## Screens

```
Today (tab)                          Meal review (after capture / tap a meal)
┌────────────────────────────┐       ┌────────────────────────────┐
│ Tuesday                    │       │ [ photo, full width ]      │
│ 1 240                      │       │ Lunch · 12:15              │
│ kcal left of 2 150         │       │ Chicken thigh   180 g  410 │
│ ||||||||||||¦¦¦¦¦¦¦¦       │       │   −  [ 180 ]  +            │
│ Protein 92 / 180  ▬▬▬──    │       │ Rice            150 g  195 │
│ Carbs  110 / 200  ▬▬▬──    │       │ + Add item                 │
│ Fat     31 / 70   ▬▬──     │       │ Total             605 kcal │
│────────────────────────────│       │ [ Save meal ]   Delete     │
│ 08:40 ▢ Eggs, kvarg   610  │       └────────────────────────────┘
│ 12:15 ▢ Chicken bowl  540  │
│                            │       Progress (tab)
│        [ Snap meal ]       │       7-day bars vs target, 7/30-day
└────────────────────────────┘       average, weight line
```

- **Today** — readout, tape, macro lines, meals of the day, Snap button in thumb reach. Empty state: "Nothing logged yet. Snap your first meal."
- **Capture** (modal) — opens camera immediately, optional hint field ("big plate, fried in butter"), then "Reading your plate…". Offline or error → meal saved as *pending* with a Retry button.
- **Meal review** — items with gram steppers; changing grams rescales kcal and macros proportionally. Add/remove items. Save / Delete.
- **Progress** — last 7 days as bars against the target line; 7- and 30-day averages; weight log and trend.
- **Settings** — Gemini API key, model, daily targets, export/import backup.

## Data

See `src/db/schema.ts`. Totals are always `SUM(meal_items)`. Photos are files; the DB stores the path.

## Gemini

`src/lib/gemini.ts` — `POST /v1beta/interactions`, model `gemini-3.8-flash` (changeable in Settings), image + prompt + optional hint, `response_format` with JSON schema:

```json
{ "items": [{ "name", "grams", "kcal", "protein", "carbs", "fat", "confidence" }] }
```

The prompt asks for visible portions only, cooked weights, and separate items for oils/sauces.

## Phases

1. **Log a meal** — capture, analyze, review/edit, save, Today screen. ✅
2. **Progress** — 7-day bars, averages, weight entry + smoothed trend. ✅
3. **Robustness** — pending queue retry on open and on foreground (offline/rate-limit errors stay pending), backup/import, daily reminder notification, haptics. ✅
4. **Speed** — favorites + "log again" (Add screen and meal screen), text-only entry via Gemini, barcode scan via Open Food Facts. ✅

## Done when (phase 1)

- Photo → saved meal in under ~10 s on 4G.
- Editing grams updates totals immediately.
- App works fully offline except analysis.
- Kill and reopen: everything is still there.
